import os
import sys
from datetime import datetime
from gerar_token import GerenciadorTokens
from relatorio import RelatorioTokens

def limpar_tela():
    """Limpa a tela do terminal"""
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_header():
    """Mostra cabeçalho do sistema"""
    print("="*70)
    print("📸 GABRIEL LIMA RETRATOS - SISTEMA DE GERENCIAMENTO")
    print("🔧 Sistema de Tokens para Galeria de Fotos")
    print(f"📅 {datetime.now().strftime('%d/%m/%Y às %H:%M')}")
    print("="*70)

def menu_backup():
    """Menu de opções de backup"""
    gt = GerenciadorTokens()
    
    while True:
        print("\n" + "="*50)
        print("💾 GERENCIAMENTO DE BACKUP")
        print("="*50)
        print("1. 💾 Criar backup manual")
        print("2. 📂 Ver backups existentes")
        print("3. 🗑️  Limpar backups antigos")
        print("4. 🚪 Voltar")
        
        opcao = input("\nEscolha uma opção: ").strip()
        
        if opcao == "1":
            print("\n💾 Criando backup...")
            gt.fazer_backup()
            print("✅ Backup criado com sucesso!")
            
        elif opcao == "2":
            listar_backups()
            
        elif opcao == "3":
            limpar_backups_antigos()
            
        elif opcao == "4":
            break
            
        else:
            print("❌ Opção inválida!")
        
        input("\n⏸️  Pressione ENTER para continuar...")

def listar_backups():
    """Lista todos os backups disponíveis"""
    try:
        if not os.path.exists('backup_tokens'):
            print("📭 Pasta de backup não encontrada.")
            return
        
        backups = sorted([f for f in os.listdir('backup_tokens') 
                         if f.startswith('tokens_backup_') and f.endswith('.json')])
        
        if not backups:
            print("📭 Nenhum backup encontrado.")
            return
        
        print("\n📂 BACKUPS DISPONÍVEIS:")
        print("-" * 50)
        
        for i, backup in enumerate(backups, 1):
            # Extrai data do nome do arquivo
            timestamp = backup.replace('tokens_backup_', '').replace('.json', '')
            try:
                data_backup = datetime.strptime(timestamp, '%Y%m%d_%H%M%S')
                data_formatada = data_backup.strftime('%d/%m/%Y às %H:%M:%S')
            except:
                data_formatada = timestamp
            
            # Tamanho do arquivo
            caminho = f"backup_tokens/{backup}"
            tamanho = os.path.getsize(caminho)
            tamanho_kb = tamanho / 1024
            
            print(f"{i:2d}. {backup}")
            print(f"    📅 {data_formatada}")
            print(f"    📊 {tamanho_kb:.1f} KB")
            print("-" * 50)
            
    except Exception as e:
        print(f"❌ Erro ao listar backups: {e}")

def limpar_backups_antigos():
    """Remove backups antigos mantendo apenas os 5 mais recentes"""
    try:
        backups = sorted([f for f in os.listdir('backup_tokens') 
                         if f.startswith('tokens_backup_') and f.endswith('.json')])
        
        if len(backups) <= 5:
            print("✅ Menos de 5 backups encontrados. Nada para limpar.")
            return
        
        print(f"🗑️  Encontrados {len(backups)} backups.")
        print(f"🔄 Mantendo os 5 mais recentes, removendo {len(backups) - 5}...")
        
        confirma = input("❓ Confirma a limpeza? (s/N): ").strip().lower()
        
        if confirma == 's':
            removidos = 0
            for backup_antigo in backups[:-5]:  # Remove todos exceto os 5 últimos
                os.remove(f"backup_tokens/{backup_antigo}")
                removidos += 1
                print(f"🗑️  Removido: {backup_antigo}")
            
            print(f"✅ {removidos} backups antigos removidos!")
        else:
            print("❌ Operação cancelada.")
            
    except Exception as e:
        print(f"❌ Erro ao limpar backups: {e}")

def status_sistema():
    """Mostra status geral do sistema"""
    try:
        gt = GerenciadorTokens()
        
        # Verifica arquivos
        arquivos_ok = all([
            os.path.exists('tokens.json'),
            os.path.exists('backup_tokens'),
            os.path.exists('logs_acesso.json')
        ])
        
        print("\n" + "="*60)
        print("🔧 STATUS DO SISTEMA")
        print("="*60)
        
        # Status dos arquivos
        print("📁 ARQUIVOS DO SISTEMA:")
        status_icon = "✅" if arquivos_ok else "❌"
        print(f"   {status_icon} Arquivos base: {'OK' if arquivos_ok else 'ERRO'}")
        
        # Conta tokens
        try:
            import json
            with open('tokens.json', 'r', encoding='utf-8') as f:
                tokens = json.load(f)
            
            ativos = sum(1 for t in tokens.values() if t['ativo'])
            total = len(tokens)
            
            print(f"   📊 Tokens cadastrados: {total}")
            print(f"   🟢 Tokens ativos: {ativos}")
            print(f"   🔴 Tokens inativos: {total - ativos}")
            
        except:
            print("   ❌ Erro ao ler tokens")
        
        # Conta backups
        try:
            backups = len([f for f in os.listdir('backup_tokens') 
                          if f.startswith('tokens_backup_')])
            print(f"   💾 Backups disponíveis: {backups}")
        except:
            print("   💾 Backups disponíveis: 0")
        
        print("="*60)
        
    except Exception as e:
        print(f"❌ Erro ao verificar status: {e}")

def menu_principal():
    """Menu principal do sistema"""
    gt = GerenciadorTokens()
    rt = RelatorioTokens()
    
    while True:
        limpar_tela()
        mostrar_header()
        
        print("\n🎯 MENU PRINCIPAL")
        print("-" * 30)
        print("1. 🆕 Gerar novo token para cliente")
        print("2. 📊 Relatórios e estatísticas")
        print("3. 💾 Gerenciar backups")
        print("4. 🔧 Status do sistema")
        print("5. ❓ Ajuda")
        print("6. 🚪 Sair")
        
        opcao = input("\n👆 Escolha uma opção: ").strip()
        
        if opcao == "1":
            print("\n" + "="*50)
            print("🆕 GERANDO NOVO TOKEN")
            print("="*50)
            try:
                token = gt.gerar_token()
                input("\n⏸️  Pressione ENTER para continuar...")
            except KeyboardInterrupt:
                print("\n❌ Operação cancelada pelo usuário.")
            except Exception as e:
                print(f"\n❌ Erro ao gerar token: {e}")
                input("\n⏸️  Pressione ENTER para continuar...")
        
        elif opcao == "2":
            try:
                from relatorio import main as relatorio_main
                relatorio_main()
            except Exception as e:
                print(f"\n❌ Erro ao abrir relatórios: {e}")
                input("\n⏸️  Pressione ENTER para continuar...")
        
        elif opcao == "3":
            try:
                menu_backup()
            except Exception as e:
                print(f"\n❌ Erro no menu de backup: {e}")
                input("\n⏸️  Pressione ENTER para continuar...")
        
        elif opcao == "4":
            status_sistema()
            input("\n⏸️  Pressione ENTER para continuar...")
        
        elif opcao == "5":
            mostrar_ajuda()
            input("\n⏸️  Pressione ENTER para continuar...")
        
        elif opcao == "6":
            print("\n👋 Obrigado por usar o sistema Gabriel Lima Retratos!")
            print("📸 Até a próxima!")
            break
        
        else:
            print("\n❌ Opção inválida! Escolha uma opção de 1 a 6.")
            input("\n⏸️  Pressione ENTER para continuar...")

def mostrar_ajuda():
    """Mostra ajuda sobre como usar o sistema"""
    print("\n" + "="*70)
    print("❓ AJUDA - COMO USAR O SISTEMA")
    print("="*70)
    
    print("\n🎯 FLUXO DE TRABALHO:")
    print("1. 📸 Termine um ensaio fotográfico")
    print("2. 📁 Organize as fotos no BOX em pastas por cliente")
    print("3. 🆕 Use a opção 1 para gerar um token único")
    print("4. 📱 Envie o link gerado para o cliente via WhatsApp")
    print("5. 📊 Acompanhe os acessos através dos relatórios")
    
    print("\n🔑 SOBRE OS TOKENS:")
    print("• Cada token é único e dá acesso apenas às fotos do cliente")
    print("• Tokens têm prazo de validade (padrão 30 dias)")
    print("• Clientes autenticados podem baixar sem marca d'água")
    print("• Visitantes veem apenas com marca d'água")
    
    print("\n📱 EXEMPLO DE LINK PARA CLIENTE:")
    print("https://seusite.github.io/galeria?token=abc123def456")
    
    print("\n💾 BACKUPS:")
    print("• O sistema faz backup automático a cada token criado")
    print("• Mantém os últimos 10 backups automaticamente")
    print("• Use a opção 3 para gerenciar backups manualmente")
    
    print("\n📊 RELATÓRIOS:")
    print("• Veja quais clientes ainda não acessaram")
    print("• Monitore tokens próximos do vencimento")
    print("• Acompanhe estatísticas de downloads")
    
    print("\n🆘 PROBLEMAS COMUNS:")
    print("• Se der erro de 'arquivo não encontrado': rode o sistema uma vez")
    print("• Para resetar: delete tokens.json e rode novamente")
    print("• Backups ficam na pasta backup_tokens/")
    
    print("\n📞 CONTATO:")
    print("WhatsApp: +55 79 9 8133-8664")
    print("Instagram: @gabriellimaretratos")
    
    print("="*70)

def verificar_instalacao():
    """Verifica se todos os módulos necessários estão instalados"""
    try:
        import uuid
        import json
        import os
        import shutil
        from datetime import datetime, timedelta
        return True
    except ImportError as e:
        print(f"❌ Módulo não encontrado: {e}")
        print("💡 Instale os módulos necessários com: pip install -r requirements.txt")
        return False

def primeira_execucao():
    """Configura o sistema na primeira execução"""
    if not os.path.exists('tokens.json'):
        print("\n🎉 PRIMEIRA EXECUÇÃO DETECTADA!")
        print("🔧 Configurando sistema...")
        
        gt = GerenciadorTokens()
        print("✅ Arquivos base criados!")
        
        print("\n💡 DICAS IMPORTANTES:")
        print("1. 📁 Organize suas fotos no BOX por categorias e clientes")
        print("2. 🔗 Sempre teste os links antes de enviar aos clientes")
        print("3. 💾 O sistema faz backups automáticos")
        print("4. 📊 Use os relatórios para acompanhar o uso")
        
        input("\n⏸️  Pressione ENTER para continuar...")

if __name__ == "__main__":
    try:
        # Verifica instalação
        if not verificar_instalacao():
            sys.exit(1)
        
        # Primeira execução
        primeira_execucao()
        
        # Inicia menu principal
        menu_principal()
        
    except KeyboardInterrupt:
        print("\n\n👋 Sistema encerrado pelo usuário. Até logo!")
    except Exception as e:
        print(f"\n❌ Erro crítico no sistema: {e}")
        print("🆘 Entre em contato com o suporte técnico.")
        input("\n⏸️  Pressione ENTER para sair...")