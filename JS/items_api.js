// /api/items.js - API completa para gestão de itens
import { supabase } from '../lib/supabase';
import { updateBoxItemCount } from './box';

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
    console.error('Erro na API Items:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// GET - Buscar itens
async function handleGet(req, res) {
  const { 
    id, 
    box_id, 
    search, 
    category, 
    condition,
    min_value,
    max_value,
    tags,
    page = 1, 
    limit = 50,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  try {
    // Buscar item específico
    if (id) {
      const { data: item, error } = await supabase
        .from('items')
        .select(`
          *,
          boxes (
            id,
            name,
            location,
            color
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar item:', error);
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      return res.status(200).json(item);
    }

    // Construir query base
    let query = supabase
      .from('items')
      .select(`
        *,
        boxes (
          id,
          name,
          location,
          color,
          type
        )
      `);

    // Aplicar filtros
    if (box_id) {
      query = query.eq('box_id', box_id);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (condition) {
      query = query.eq('condition', condition);
    }

    if (min_value) {
      query = query.gte('estimated_value', parseFloat(min_value));
    }

    if (max_value) {
      query = query.lte('estimated_value', parseFloat(max_value));
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.overlaps('tags', tagArray);
    }

    // Validar campos de ordenação
    const validSortFields = ['created_at', 'name', 'estimated_value', 'category', 'condition'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? { ascending: true } : { ascending: false };

    // Aplicar ordenação e paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order(sortField, sortOrder)
      .range(offset, offset + parseInt(limit) - 1);

    const { data: items, error } = await query;

    if (error) {
      console.error('Erro ao buscar itens:', error);
      return res.status(500).json({ error: 'Erro ao buscar itens' });
    }

    // Contar total para paginação
    let countQuery = supabase
      .from('items')
      .select('*', { count: 'exact', head: true });

    // Aplicar os mesmos filtros para a contagem
    if (box_id) countQuery = countQuery.eq('box_id', box_id);
    if (search) countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (category) countQuery = countQuery.eq('category', category);
    if (condition) countQuery = countQuery.eq('condition', condition);
    if (min_value) countQuery = countQuery.gte('estimated_value', parseFloat(min_value));
    if (max_value) countQuery = countQuery.lte('estimated_value', parseFloat(max_value));
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countQuery = countQuery.overlaps('tags', tagArray);
    }

    const { count: totalCount } = await countQuery;

    return res.status(200).json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro no GET Items:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// POST - Criar novo item
async function handlePost(req, res) {
  const {
    name,
    description,
    category,
    box_id,
    quantity = 1,
    estimated_value = 0,
    condition = 'good',
    location_in_box,
    images = [],
    tags = []
  } = req.body;

  // Validações obrigatórias
  if (!name || !category || !box_id) {
    return res.status(400).json({
      error: 'Campos obrigatórios: name, category, box_id'
    });
  }

  try {
    // Verificar se a caixa existe
    const { data: box, error: boxError } = await supabase
      .from('boxes')
      .select('id, name')
      .eq('id', box_id)
      .single();

    if (boxError || !box) {
      return res.status(400).json({
        error: 'Caixa não encontrada'
      });
    }

    // Validar quantidade e valor
    const validQuantity = Math.max(1, parseInt(quantity) || 1);
    const validValue = Math.max(0, parseFloat(estimated_value) || 0);

    // Criar novo item
    const { data: newItem, error } = await supabase
      .from('items')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        box_id,
        quantity: validQuantity,
        estimated_value: validValue,
        condition,
        location_in_box: location_in_box?.trim() || null,
        images: Array.isArray(images) ? images : [],
        tags: Array.isArray(tags) ? tags : []
      }])
      .select(`
        *,
        boxes (
          id,
          name,
          location,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Erro ao criar item:', error);
      return res.status(500).json({ error: 'Erro ao criar item' });
    }

    // Atualizar contagem de itens na caixa
    try {
      await updateBoxItemCount(box_id);
    } catch (updateError) {
      console.error('Erro ao atualizar contagem da caixa:', updateError);
      // Não falhar a criação do item por causa disso
    }

    return res.status(201).json(newItem);

  } catch (error) {
    console.error('Erro no POST Items:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// PUT - Atualizar item
async function handlePut(req, res) {
  const { id } = req.query;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do item é obrigatório' });
  }

  try {
    // Verificar se o item existe
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, box_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingItem) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const oldBoxId = existingItem.box_id;

    // Se mudando de caixa, verificar se a nova caixa existe
    if (updateData.box_id && updateData.box_id !== oldBoxId) {
      const { data: newBox, error: boxError } = await supabase
        .from('boxes')
        .select('id')
        .eq('id', updateData.box_id)
        .single();

      if (boxError || !newBox) {
        return res.status(400).json({
          error: 'Nova caixa não encontrada'
        });
      }
    }

    // Limpar dados e validar
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    );

    // Validar tipos de dados
    if (cleanedData.quantity) {
      cleanedData.quantity = Math.max(1, parseInt(cleanedData.quantity) || 1);
    }

    if (cleanedData.estimated_value) {
      cleanedData.estimated_value = Math.max(0, parseFloat(cleanedData.estimated_value) || 0);
    }

    // Garantir que arrays sejam arrays
    if (cleanedData.images && !Array.isArray(cleanedData.images)) {
      cleanedData.images = [];
    }

    if (cleanedData.tags && !Array.isArray(cleanedData.tags)) {
      cleanedData.tags = [];
    }

    // Adicionar timestamp de atualização
    cleanedData.updated_at = new Date().toISOString();

    // Atualizar item
    const { data: updatedItem, error } = await supabase
      .from('items')
      .update(cleanedData)
      .eq('id', id)
      .select(`
        *,
        boxes (
          id,
          name,
          location,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar item:', error);
      return res.status(500).json({ error: 'Erro ao atualizar item' });
    }

    // Atualizar contagem nas caixas afetadas
    try {
      const boxesToUpdate = new Set([oldBoxId]);
      if (updateData.box_id && updateData.box_id !== oldBoxId) {
        boxesToUpdate.add(updateData.box_id);
      }

      for (const boxId of boxesToUpdate) {
        await updateBoxItemCount(boxId);
      }
    } catch (updateError) {
      console.error('Erro ao atualizar contagens das caixas:', updateError);
    }

    return res.status(200).json(updatedItem);

  } catch (error) {
    console.error('Erro no PUT Items:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// DELETE - Excluir item
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do item é obrigatório' });
  }

  try {
    // Buscar item para obter box_id antes de excluir
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, box_id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingItem) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const boxId = existingItem.box_id;

    // Excluir item
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir item:', error);
      return res.status(500).json({ error: 'Erro ao excluir item' });
    }

    // Atualizar contagem da caixa
    try {
      await updateBoxItemCount(boxId);
    } catch (updateError) {
      console.error('Erro ao atualizar contagem da caixa:', updateError);
    }

    return res.status(200).json({ 
      message: 'Item excluído com sucesso',
      id,
      name: existingItem.name
    });

  } catch (error) {
    console.error('Erro no DELETE Items:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Funções auxiliares para estatísticas
export async function getItemStats() {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('category, condition, estimated_value, quantity');

    if (error) throw error;

    const stats = {
      total: items.length,
      totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      totalValue: items.reduce((sum, item) => sum + (item.estimated_value || 0), 0),
      byCategory: {},
      byCondition: {},
      averageValue: 0
    };

    // Calcular valor médio
    if (items.length > 0) {
      stats.averageValue = stats.totalValue / items.length;
    }

    // Agrupar por categoria
    items.forEach(item => {
      const category = item.category || 'Sem categoria';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = {
          count: 0,
          value: 0,
          quantity: 0
        };
      }
      stats.byCategory[category].count++;
      stats.byCategory[category].value += item.estimated_value || 0;
      stats.byCategory[category].quantity += item.quantity || 0;
    });

    // Agrupar por condição
    items.forEach(item => {
      const condition = item.condition || 'unknown';
      if (!stats.byCondition[condition]) {
        stats.byCondition[condition] = 0;
      }
      stats.byCondition[condition]++;
    });

    return stats;
  } catch (error) {
    console.error('Erro ao obter estatísticas de itens:', error);
    throw error;
  }
}

// Função para buscar itens relacionados (por tags similares)
export async function getRelatedItems(itemId, limit = 5) {
  try {
    // Buscar item atual
    const { data: currentItem, error: currentError } = await supabase
      .from('items')
      .select('tags, category')
      .eq('id', itemId)
      .single();

    if (currentError) throw currentError;

    // Buscar itens relacionados
    let query = supabase
      .from('items')
      .select(`
        id,
        name,
        category,
        estimated_value,
        images,
        boxes (name, location)
      `)
      .neq('id', itemId)
      .limit(limit);

    // Priorizar mesma categoria
    if (currentItem.category) {
      query = query.eq('category', currentItem.category);
    }

    // Se tiver tags, buscar itens com tags similares
    if (currentItem.tags && currentItem.tags.length > 0) {
      query = query.overlaps('tags', currentItem.tags);
    }

    const { data: relatedItems, error } = await query;

    if (error) throw error;

    return relatedItems || [];
  } catch (error) {
    console.error('Erro ao buscar itens relacionados:', error);
    return [];
  }
}