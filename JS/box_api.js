// /api/box.js - API completa para gestão de caixas
import { supabase } from '../lib/supabase';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// GET - Buscar caixas
async function handleGet(req, res) {
  const { id, search, status, type, page = 1, limit = 50 } = req.query;

  try {
    // Buscar caixa específica
    if (id) {
      const { data: box, error } = await supabase
        .from('boxes')
        .select(`
          *,
          items (
            id,
            name,
            description,
            category,
            quantity,
            estimated_value,
            condition,
            location_in_box,
            images,
            tags,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar caixa:', error);
        return res.status(404).json({ error: 'Caixa não encontrada' });
      }

      return res.status(200).json(box);
    }

    // Buscar múltiplas caixas com filtros
    let query = supabase
      .from('boxes')
      .select(`
        *,
        items (count)
      `);

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    const { data: boxes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar caixas:', error);
      return res.status(500).json({ error: 'Erro ao buscar caixas' });
    }

    // Contar total para paginação
    const { count: totalCount } = await supabase
      .from('boxes')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      boxes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro no GET:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// POST - Criar nova caixa
async function handlePost(req, res) {
  const {
    name,
    description,
    type,
    color,
    location,
    qr_code,
    estimated_value,
    tags,
    images
  } = req.body;

  // Validações obrigatórias
  if (!name || !type || !location) {
    return res.status(400).json({
      error: 'Campos obrigatórios: name, type, location'
    });
  }

  try {
    // Verificar se QR Code já existe (se fornecido)
    if (qr_code) {
      const { data: existingBox } = await supabase
        .from('boxes')
        .select('id')
        .eq('qr_code', qr_code)
        .single();

      if (existingBox) {
        return res.status(400).json({
          error: 'QR Code já está em uso por outra caixa'
        });
      }
    }

    // Criar nova caixa
    const { data: newBox, error } = await supabase
      .from('boxes')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        type,
        color: color || '#3B82F6',
        location: location.trim(),
        qr_code: qr_code || null,
        estimated_value: estimated_value || 0,
        tags: tags || [],
        images: images || [],
        status: 'active',
        item_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar caixa:', error);
      return res.status(500).json({ error: 'Erro ao criar caixa' });
    }

    return res.status(201).json(newBox);

  } catch (error) {
    console.error('Erro no POST:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// PUT - Atualizar caixa
async function handlePut(req, res) {
  const { id } = req.query;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID da caixa é obrigatório' });
  }

  try {
    // Verificar se a caixa existe
    const { data: existingBox } = await supabase
      .from('boxes')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingBox) {
      return res.status(404).json({ error: 'Caixa não encontrada' });
    }

    // Verificar QR Code único (se sendo atualizado)
    if (updateData.qr_code) {
      const { data: qrExists } = await supabase
        .from('boxes')
        .select('id')
        .eq('qr_code', updateData.qr_code)
        .neq('id', id)
        .single();

      if (qrExists) {
        return res.status(400).json({
          error: 'QR Code já está em uso por outra caixa'
        });
      }
    }

    // Limpar dados vazios e preparar atualização
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== '' && value !== null)
    );

    // Adicionar timestamp de atualização
    cleanedData.updated_at = new Date().toISOString();

    // Atualizar caixa
    const { data: updatedBox, error } = await supabase
      .from('boxes')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar caixa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar caixa' });
    }

    return res.status(200).json(updatedBox);

  } catch (error) {
    console.error('Erro no PUT:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// DELETE - Excluir caixa
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID da caixa é obrigatório' });
  }

  try {
    // Verificar se a caixa existe
    const { data: existingBox } = await supabase
      .from('boxes')
      .select('id, item_count')
      .eq('id', id)
      .single();

    if (!existingBox) {
      return res.status(404).json({ error: 'Caixa não encontrada' });
    }

    // Verificar se a caixa tem itens
    if (existingBox.item_count > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir caixa que contém itens. Remova todos os itens primeiro.'
      });
    }

    // Excluir caixa
    const { error } = await supabase
      .from('boxes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir caixa:', error);
      return res.status(500).json({ error: 'Erro ao excluir caixa' });
    }

    return res.status(200).json({ 
      message: 'Caixa excluída com sucesso',
      id 
    });

  } catch (error) {
    console.error('Erro no DELETE:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Funções auxiliares para estatísticas
export async function getBoxStats() {
  try {
    const { data: stats, error } = await supabase
      .from('boxes')
      .select('status, type, estimated_value');

    if (error) throw error;

    const summary = {
      total: stats.length,
      active: stats.filter(box => box.status === 'active').length,
      inactive: stats.filter(box => box.status === 'inactive').length,
      totalValue: stats.reduce((sum, box) => sum + (box.estimated_value || 0), 0),
      byType: {}
    };

    // Agrupar por tipo
    stats.forEach(box => {
      if (!summary.byType[box.type]) {
        summary.byType[box.type] = 0;
      }
      summary.byType[box.type]++;
    });

    return summary;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw error;
  }
}

// Função para atualizar contagem de itens
export async function updateBoxItemCount(boxId) {
  try {
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('box_id', boxId);

    await supabase
      .from('boxes')
      .update({ item_count: count })
      .eq('id', boxId);

    return count;
  } catch (error) {
    console.error('Erro ao atualizar contagem de itens:', error);
    throw error;
  }
}