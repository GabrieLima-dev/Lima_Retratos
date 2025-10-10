import json
import os
from datetime import datetime
from gerar_token import GerenciadorTokens

class RelatorioTokens:
    def __init__(self):
        self.gt = GerenciadorTokens()
        self.arquivo_tokens = 'tokens.json'
        self.arquivo_logs = 'logs_acesso.json'
    
    def mostrar_relatorio_completo(self):
        """Mostra relatório detalhado de todos os tokens"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            if not tokens:
                print("📭 Nenhum token encontrado.")
                return
            
            # Contadores
            ativos = 0
            expirados = 0
            inativos = 0
            nunca_acessaram = 0
            total_downloads = 0
            
            print("\n" + "="*80)
            print("📊 RELATÓRIO COMPLETO DE TOKENS - GABRIEL LIMA RETRATOS")
            print("="*80)
            
            for token, dados in tokens.items():
                expira = datetime.fromisoformat(dados['expira_em'])
                agora = datetime.now()
                
                # Determina status
                if not dados['ativo']:
                    status = "🔴 INATIVO"
                    inativos += 1
                elif expira < agora:
                    status = "⚠️  EXPIRADO"
                    expirados += 1
                else:
                    dias_restantes = (expira - agora).days
                    status = f"🟢 ATIVO ({dias_restantes}d)"
                    ativos += 1
                
                # Verifica se nunca acessou
                if not dados['acessos']:
                    nunca_acessaram += 1
                
                # Conta downloads
                total_downloads += len(dados['fotos_baixadas'])
                
                # Último acesso
                ultimo_acesso = "Nunca"
                if dados['acessos']:
                    ultimo_dt = datetime.fromisoformat(dados['acessos'][-1])
                    ultimo_acesso = ultimo_dt.strftime('%d/%m/%Y às %H:%M')
                
                print(f"\n👤 {dados['cliente']}")
                print(f"   🔑 Token: {token}")
                print(f"   📊 Status: {status}")
                print(f"   📂 {dados['categoria']} → {dados['pasta']}")
                print(f"   📅 Criado em: {datetime.fromisoformat(dados['criado_em']).strftime('%d/%m/%Y')}")
                print(f"   🕒 Último acesso: {ultimo_acesso}")
                print(f"   🔗 Total de acessos: {len(dados['acessos'])}")
                print(f"   💾 Fotos baixadas: {len(dados['fotos_baixadas'])}")
                print("-" * 80)
            
            # Resumo final
            print("\n" + "="*80)
            print("📈 RESUMO ESTATÍSTICO")
            print("="*80)
            print(f"📊 Total de tokens: {len(tokens)}")
            print(f"🟢 Tokens ativos: {ativos}")
            print(f"⚠️  Tokens expirados: {expirados}")
            print(f"🔴 Tokens inativos: {inativos}")
            print(f"👻 Nunca acessaram: {nunca_acessaram}")
            print(f"💾 Total de downloads: {total_downloads}")
            print("="*80)
            
        except Exception as e:
            print(f"❌ Erro ao gerar relatório: {e}")
    
    def clientes_nunca_acessaram(self):
        """Lista clientes que nunca acessaram"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            nunca_acessaram = []
            
            for token, dados in tokens.items():
                if not dados['acessos'] and dados['ativo']:
                    nunca_acessaram.append((token, dados))
            
            if not nunca_acessaram:
                print("✅ Todos os clientes ativos já acessaram!")
                return
            
            print("\n" + "="*60)
            print("👻 CLIENTES QUE NUNCA ACESSARAM")
            print("="*60)
            
            for token, dados in nunca_acessaram:
                dias_desde_criacao = (datetime.now() - datetime.fromisoformat(dados['criado_em'])).days
                print(f"\n👤 {dados['cliente']}")
                print(f"   🔑 Token: {token}")
                print(f"   📂 {dados['categoria']}")
                print(f"   📅 Criado há {dias_desde_criacao} dias")
                print(f"   📱 Link: https://seusite.github.io/galeria?token={token}")
            
            print("="*60)
            
        except Exception as e:
            print(f"❌ Erro ao listar clientes: {e}")
    
    def tokens_expirando(self, dias=7):
        """Lista tokens que vão expirar em X dias"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            expirando = []
            agora = datetime.now()
            
            for token, dados in tokens.items():
                if not dados['ativo']:
                    continue
                    
                expira = datetime.fromisoformat(dados['expira_em'])
                dias_restantes = (expira - agora).days
                
                if 0 <= dias_restantes <= dias:
                    expirando.append((token, dados, dias_restantes))
            
            if not expirando:
                print(f"✅ Nenhum token expira nos próximos {dias} dias!")
                return
            
            print(f"\n" + "="*60)
            print(f"⚠️  TOKENS EXPIRANDO EM {dias} DIAS")
            print("="*60)
            
            # Ordena por dias restantes
            expirando.sort(key=lambda x: x[2])
            
            for token, dados, dias_restantes in expirando:
                urgencia = "🚨 HOJE!" if dias_restantes == 0 else f"⏰ {dias_restantes} dia(s)"
                
                print(f"\n👤 {dados['cliente']}")
                print(f"   🔑 Token: {token}")
                print(f"   ⚠️  Expira: {urgencia}")
                print(f"   📂 {dados['categoria']}")
                print(f"   🔗 Acessos: {len(dados['acessos'])}")
            
            print("="*60)
            
        except Exception as e:
            print(f"❌ Erro ao verificar expiração: {e}")
    
    def desativar_token(self):
        """Desativa um token específico"""
        try:
            # Primeiro mostra tokens ativos
            print("\n📋 TOKENS ATIVOS:")
            self.listar_tokens_ativos()
            
            token = input("\n🔑 Digite o token para desativar: ").strip()
            
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            if token not in tokens:
                print("❌ Token não encontrado!")
                return
            
            if not tokens[token]['ativo']:
                print("⚠️  Token já está inativo!")
                return
            
            # Confirma desativação
            cliente = tokens[token]['cliente']
            confirma = input(f"❓ Desativar token do cliente '{cliente}'? (s/N): ").strip().lower()
            
            if confirma == 's':
                tokens[token]['ativo'] = False
                tokens[token]['desativado_em'] = datetime.now().isoformat()
                
                with open(self.arquivo_tokens, 'w', encoding='utf-8') as f:
                    json.dump(tokens, f, indent=2, ensure_ascii=False)
                
                # Faz backup
                self.gt.fazer_backup()
                
                print(f"✅ Token do cliente '{cliente}' foi desativado!")
            else:
                print("❌ Operação cancelada.")
                
        except Exception as e:
            print(f"❌ Erro ao desativar token: {e}")
    
    def listar_tokens_ativos(self):
        """Lista apenas tokens ativos"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            ativos = []
            agora = datetime.now()
            
            for token, dados in tokens.items():
                if dados['ativo']:
                    expira = datetime.fromisoformat(dados['expira_em'])
                    if expira > agora:  # Não expirado
                        ativos.append((token, dados))
            
            if not ativos:
                print("📭 Nenhum token ativo encontrado.")
                return
            
            for token, dados in ativos:
                expira = datetime.fromisoformat(dados['expira_em'])
                dias_restantes = (expira - agora).days
                
                print(f"👤 {dados['cliente']} | Token: {token[:8]}... | {dias_restantes} dias restantes")
                
        except Exception as e:
            print(f"❌ Erro ao listar tokens ativos: {e}")
    
    def estatisticas_categoria(self):
        """Mostra estatísticas por categoria"""
        try:
            with open(self.arquivo_tokens, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            stats = {}
            
            for token, dados in tokens.items():
                categoria = dados['categoria']
                if categoria not in stats:
                    stats[categoria] = {
                        'total': 0,
                        'ativos': 0,
                        'downloads': 0,
                        'acessos': 0
                    }
                
                stats[categoria]['total'] += 1
                if dados['ativo']:
                    stats[categoria]['ativos'] += 1
                stats[categoria]['downloads'] += len(dados['fotos_baixadas'])
                stats[categoria]['acessos'] += len(dados['acessos'])
            
            print("\n" + "="*60)
            print("📊 ESTATÍSTICAS POR CATEGORIA")
            print("="*60)
            
            for categoria, dados in stats.items():
                print(f"\n📂 {categoria}")
                print(f"   📊 Total de clientes: {dados['total']}")
                print(f"   🟢 Ativos: {dados['ativos']}")
                print(f"   🔗 Total de acessos: {dados['acessos']}")
                print(f"   💾 Total de downloads: {dados['downloads']}")
            
            print("="*60)
            
        except Exception as e:
            print(f"❌ Erro ao gerar estatísticas: {e}")

def main():
    """Menu principal do relatório"""
    rt = RelatorioTokens()
    
    while True:
        print("\n" + "="*50)
        print("📊 RELATÓRIOS - GABRIEL LIMA RETRATOS")
        print("="*50)
        print("1. 📋 Relatório completo")
        print("2. 👻 Clientes que nunca acessaram")
        print("3. ⚠️  Tokens expirando (7 dias)")
        print("4. ❌ Desativar token")
        print("5. 🟢 Listar apenas ativos")
        print("6. 📊 Estatísticas por categoria")
        print("7. 🚪 Voltar")
        
        opcao = input("\nEscolha uma opção: ").strip()
        
        if opcao == "1":
            rt.mostrar_relatorio_completo()
        elif opcao == "2":
            rt.clientes_nunca_acessaram()
        elif opcao == "3":
            rt.tokens_expirando()
        elif opcao == "4":
            rt.desativar_token()
        elif opcao == "5":
            rt.listar_tokens_ativos()
        elif opcao == "6":
            rt.estatisticas_categoria()
        elif opcao == "7":
            break
        else:
            print("❌ Opção inválida!")
        
        input("\n⏸️  Pressione ENTER para continuar...")

if __name__ == "__main__":
    main()