import uuid
import json
import os
import re
import shutil
from datetime import datetime, timedelta
from urllib.parse import quote_plus

class GerenciadorTokens:
    def __init__(self):
        self.arquivo_tokens = 'tokens.json'
        self.arquivo_backup = 'backup_tokens/'
        self.arquivo_logs = 'logs_acesso.json'
        self.criar_arquivos_base()
        self.pasta_fotos = 'fotos'
    
    def criar_arquivos_base(self):
        """Cria arquivos e pastas base se não existirem"""
        if not os.path.exists(self.arquivo_tokens):
            with open(self.arquivo_tokens, 'w', encoding='utf-8') as f:
                json.dump({}, f)
        
        if not os.path.exists('backup_tokens'):
            os.makedirs('backup_tokens')
            
        if not os.path.exists(self.arquivo_logs):
            with open(self.arquivo_logs, 'w', encoding='utf-8') as f:
                json.dump([], f)
    
    def listar_albuns_disponiveis(self):
        """Retorna lista de arquivos JSON disponíveis em /fotos"""
        if not os.path.isdir(self.pasta_fotos):
            return []
        albuns = []
        for nome in sorted(os.listdir(self.pasta_fotos)):
            if not nome.lower().endswith('.json'):
                continue
            slug = nome[:-5]
            titulo = slug.replace('_', ' ').strip() or slug
            albuns.append({
                'arquivo': nome,
                'slug': slug,
                'titulo': titulo
            })
        return albuns

    def solicitar_pastas_permitidas(self, cliente):
        """Permite escolher quais pastas/álbuns o cliente poderá acessar"""
        albuns = self.listar_albuns_disponiveis()

        if not albuns:
            print("\n⚠️  Nenhum arquivo encontrado em /fotos. Informe manualmente o nome da pasta/álbum.")
            manual = input("📁 Nome do álbum liberado (sem .json): ").strip()
            return [manual] if manual else []

        print("\n" + "-" * 30)
        print("📁 ÁLBUNS DISPONÍVEIS")
        print("-" * 30)
        for idx, album in enumerate(albuns, 1):
            print(f"{idx:2d}. {album['titulo']}  ({album['slug']})")
        print("-" * 30)
        print("Digite os números separados por vírgula para selecionar múltiplos álbuns.")
        print("Use '*' para liberar todos os álbuns ou informe o nome manualmente.")

        while True:
            selecao = input(f"\nQuais álbuns {cliente} pode acessar? ").strip()
            if selecao == '*':
                return [album['slug'] for album in albuns]

            if not selecao:
                print("❌ Informe pelo menos um álbum (ou '*' para todos).")
                continue

            selecionados = set()
            partes = [parte.strip() for parte in selecao.replace(';', ',').split(',') if parte.strip()]

            for parte in partes:
                if parte.isdigit():
                    indice = int(parte) - 1
                    if 0 <= indice < len(albuns):
                        selecionados.add(albuns[indice]['slug'])
                    else:
                        print(f"⚠️  Índice {parte} fora da lista.")
                else:
                    slug = parte
                    if slug.lower().endswith('.json'):
                        slug = slug[:-5]
                    if slug:
                        selecionados.add(slug)

            if selecionados:
                return sorted(selecionados)

            print("❌ Nenhum álbum válido foi selecionado. Tente novamente.")

    def gerar_token(self):
        """Gera um novo token para cliente"""
        token = str(uuid.uuid4())[:12]  # Gera token de 12 caracteres
        
        print("\n" + "="*50)
        print("🆕 NOVO TOKEN PARA CLIENTE")
        print("="*50)
        
        # Coleta informações do cliente
        cliente = input("👤 Nome do cliente: ").strip()
        
        print("\nCategorias disponíveis:")
        print("1. Batizados")
        print("2. Gestantes") 
        print("3. Missas")
        print("4. Outros")
        
        cat_opcao = input("📂 Escolha a categoria (1-4): ").strip()
        categorias = {"1": "Batizados", "2": "Gestantes", "3": "Missas", "4": "Outros"}
        categoria = categorias.get(cat_opcao, "Outros")
        
        pastas_permitidas = self.solicitar_pastas_permitidas(cliente)
        pasta_principal = pastas_permitidas[0] if pastas_permitidas else ""
        whatsapp = self.solicitar_whatsapp(cliente)
        
        # Configurações avançadas
        print("\n" + "-"*30)
        print("⚙️  CONFIGURAÇÕES AVANÇADAS")
        print("-"*30)
        
        dias_input = input("⏰ Dias de validade (padrão 30): ").strip()
        dias_validade = int(dias_input) if dias_input else 30
        
        # Calcula data de expiração
        expira_em = (datetime.now() + timedelta(days=dias_validade)).isoformat()
        
        # Carrega tokens existentes
        tokens = self.carregar_tokens()
        
        # Cria novo token
        tokens[token] = {
            "cliente": cliente,
            "categoria": categoria,
            "pasta": pasta_principal,
            "pastas_permitidas": pastas_permitidas,
            "whatsapp": whatsapp,
            "downloads_permitidos": True,
            "fotos_baixadas": [],  # Lista de fotos que o cliente baixou
            "acessos": [],  # Lista de timestamps de acesso
            "criado_em": datetime.now().isoformat(),
            "expira_em": expira_em,
            "ativo": True
        }
        
        # Salva no arquivo
        with open(self.arquivo_tokens, 'w', encoding='utf-8') as f:
            json.dump(tokens, f, indent=2, ensure_ascii=False)
        
        # Faz backup automático
        self.fazer_backup()
        
        # Mostra resultado
        print("\n" + "="*50)
        print("✅ TOKEN CRIADO COM SUCESSO!")
        print("="*50)
        print(f"🔑 Token: {token}")
        print(f"👤 Cliente: {cliente}")
        print(f"📂 Categoria: {categoria}")
        if pastas_permitidas:
            print("📁 Álbum(s) liberados:")
            for nome in pastas_permitidas:
                print(f"   • {nome}")
        else:
            print("📁 Álbum: (nenhum definido)")
        print(f"⏰ Válido até: {datetime.fromisoformat(expira_em).strftime('%d/%m/%Y às %H:%M')}")
        print("\n📱 Link para enviar ao cliente:")
        print(f"🌐 https://gabrielima-dev.github.io/Lima_Retratos/galeria.html")
        self.exibir_link_whatsapp(cliente, token, dias_validade, whatsapp)
        print("="*50)
        
        return token
    
    def fazer_backup(self):
        """Cria backup automático dos tokens"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_tokens/tokens_backup_{timestamp}.json"
        
        try:
            # Copia arquivo atual para backup
            shutil.copy2(self.arquivo_tokens, backup_file)
            
            # Remove backups antigos (mantém apenas últimos 10)
            backups = sorted([f for f in os.listdir('backup_tokens') 
                            if f.startswith('tokens_backup_') and f.endswith('.json')])
            
            if len(backups) > 10:
                for backup_antigo in backups[:-10]:
                    os.remove(f"backup_tokens/{backup_antigo}")
                    
            print(f"💾 Backup criado: {backup_file}")
            
        except Exception as e:
            print(f"⚠️  Erro ao criar backup: {e}")
    
    def listar_tokens(self):
        """Lista todos os tokens de forma organizada"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            if not tokens:
                print("📭 Nenhum token encontrado.")
                return
            
            print("\n" + "="*70)
            print("📋 LISTA DE TOKENS")
            print("="*70)
            
            for i, (token, dados) in enumerate(tokens.items(), 1):
                expira = datetime.fromisoformat(dados['expira_em'])
                agora = datetime.now()
                
                # Define status
                if not dados['ativo']:
                    status = "🔴 INATIVO"
                elif expira < agora:
                    status = "⚠️  EXPIRADO"
                else:
                    dias_restantes = (expira - agora).days
                    status = f"🟢 ATIVO ({dias_restantes} dias restantes)"
                
                print(f"\n{i}. {dados['cliente']}")
                print(f"   🔑 Token: {token}")
                print(f"   📊 Status: {status}")
                print(f"   📂 {dados['categoria']} → {self.formatar_pastas(dados)}")
                print(f"   📅 Criado: {datetime.fromisoformat(dados['criado_em']).strftime('%d/%m/%Y')}")
                print(f"   🔗 Acessos: {len(dados['acessos'])}")
                print(f"   💾 Downloads: {len(dados['fotos_baixadas'])}")
                print("-" * 70)
                
        except Exception as e:
            print(f"❌ Erro ao listar tokens: {e}")

    def formatar_pastas(self, dados_token):
        """Retorna string legível das pastas liberadas"""
        pastas = dados_token.get('pastas_permitidas') or []
        if pastas:
            return ', '.join(pastas)
        if dados_token.get('pasta'):
            return dados_token['pasta']
        return 'Todos os álbuns'

    def solicitar_whatsapp(self, cliente):
        """Coleta número de WhatsApp do cliente"""
        numero = input(f"📞 WhatsApp do cliente ({cliente}) com DDD+país (opcional): ").strip()
        if not numero:
            return ""
        somente_digitos = re.sub(r'\D', '', numero)
        if len(somente_digitos) < 10:
            print("⚠️  Número muito curto, será armazenado mesmo assim.")
        return somente_digitos

    def exibir_link_whatsapp(self, cliente, token, dias_validade, whatsapp):
        """Mostra link pronto para enviar via WhatsApp"""
        mensagem = (
            f"Olá {cliente}! Aqui está o seu código de acesso: {token}.\n"
            f"Acesse sua galeria e aproveite que você tem {dias_validade} dias para baixar suas fotos."
        )
        mensagem_codificada = quote_plus(mensagem)
        if whatsapp:
            link = f"https://wa.me/{whatsapp}?text={mensagem_codificada}"
            print("\n📲 Mensagem formatada para WhatsApp:")
            print(link)
        else:
            link = f"https://wa.me/?text={mensagem_codificada}"
            print("\n📲 Copie e envie esta mensagem no WhatsApp:")
            print(link)

    def carregar_tokens(self):
        """Lê tokens.json tolerando arquivo vazio/corrompido"""
        try:
            if not os.path.exists(self.arquivo_tokens):
                return {}
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                conteudo = f.read().strip()
                if not conteudo:
                    return {}
                return json.loads(conteudo)
        except json.JSONDecodeError:
            print("⚠️  tokens.json está vazio ou corrompido. Será recriado.")
            return {}

# Função para usar diretamente
def criar_novo_token():
    """Função rápida para criar um token"""
    gt = GerenciadorTokens()
    return gt.gerar_token()

if __name__ == "__main__":
    # Se executar este arquivo diretamente
    gt = GerenciadorTokens()
    gt.gerar_token()
