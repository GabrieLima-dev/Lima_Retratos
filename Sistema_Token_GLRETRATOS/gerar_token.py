import uuid
import json
import os
import shutil
from datetime import datetime, timedelta

class GerenciadorTokens:
    def __init__(self):
        self.arquivo_tokens = 'tokens.json'
        self.arquivo_backup = 'backup_tokens/'
        self.arquivo_logs = 'logs_acesso.json'
        self.criar_arquivos_base()
    
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
        
        pasta = input(f"📁 Nome da pasta no BOX (ex: {cliente.replace(' ', '_')}_2024): ").strip()
        
        # Configurações avançadas
        print("\n" + "-"*30)
        print("⚙️  CONFIGURAÇÕES AVANÇADAS")
        print("-"*30)
        
        dias_input = input("⏰ Dias de validade (padrão 30): ").strip()
        dias_validade = int(dias_input) if dias_input else 30
        
        # Calcula data de expiração
        expira_em = (datetime.now() + timedelta(days=dias_validade)).isoformat()
        
        # Carrega tokens existentes
        with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
            tokens = json.load(f)
        
        # Cria novo token
        tokens[token] = {
            "cliente": cliente,
            "categoria": categoria,
            "pasta": pasta,
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
        print(f"📁 Pasta: {pasta}")
        print(f"⏰ Válido até: {datetime.fromisoformat(expira_em).strftime('%d/%m/%Y às %H:%M')}")
        print("\n📱 Link para enviar ao cliente:")
        print(f"🌐 https://seusite.github.io/galeria?token={token}")
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
                print(f"   📂 {dados['categoria']} → {dados['pasta']}")
                print(f"   📅 Criado: {datetime.fromisoformat(dados['criado_em']).strftime('%d/%m/%Y')}")
                print(f"   🔗 Acessos: {len(dados['acessos'])}")
                print(f"   💾 Downloads: {len(dados['fotos_baixadas'])}")
                print("-" * 70)
                
        except Exception as e:
            print(f"❌ Erro ao listar tokens: {e}")

# Função para usar diretamente
def criar_novo_token():
    """Função rápida para criar um token"""
    gt = GerenciadorTokens()
    return gt.gerar_token()

if __name__ == "__main__":
    # Se executar este arquivo diretamente
    gt = GerenciadorTokens()
    gt.gerar_token()