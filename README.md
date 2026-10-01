# DATA_CORRUPTED

Homepage pessoal do Hendo3 com visual cyberpunk, efeitos de terminal e links organizados em setores. Links, setores e aliases são editados na própria página e persistidos no navegador.

HTML, CSS e JavaScript puros. Sem build, dependências npm, login ou backend. Essencialmente estático.

## Funcionalidades

- Adicionar, editar, mover e remover links pelo terminal.
- Criar, renomear, reordenar e remover setores com layout em grade adaptável.
- Autocomplete de comandos, setores, links e aliases.
- Persistência local com IndexedDB e atualização entre abas da mesma origem.
- Exportação e importação de backups JSON.
- Navegador de pastas públicas do Google Drive, mediante configuração da API.
- Relógio, status de rede, logs aleatórios e efeitos visuais de glitch/CRT.
- Busca no Google para textos que não correspondem a comandos.

## Rodar localmente

Na raiz do projeto que contém `dist/`:

```sh
python3 -m http.server 8000 --directory dist
```

Acesse `http://localhost:8000`. Se o conteúdo de `dist/` já estiver na raiz do repositório do Pages, use `python3 -m http.server 8000` nessa pasta.

Use um servidor HTTP; abrir `index.html` diretamente com `file://` pode impedir o carregamento dos módulos e arquivos JSON.

## Comandos

| Ação | Exemplo |
| --- | --- |
| Ajuda | `help` ou `edit --help` |
| Adicionar link | `add dev \| Meu link \| https://example.com` |
| Listar links | `list` ou `ls dev` |
| Alterar URL | `edit GITHUB \| https://github.com/Hendo3` |
| Alterar setor, nome e URL | `edit GITHUB \| tools \| MEU GITHUB \| https://github.com/Hendo3` |
| Remover link | `remove MEU GITHUB` ou `rm <ID>` |
| Listar setores | `sector list` |
| Criar setor | `sector add games \| JOGOS` |
| Renomear setor | `sector rename games \| JOGOS E GUIAS` |
| Mover setor | `sector move games 1` |
| Remover setor vazio | `sector remove games` |
| Remover setor e transferir seus links | `sector remove games tools` |
| Criar alias | `alias ad="add dev"` |
| Listar/remover aliases | `aliases` / `unalias ad` |
| Baixar backup JSON | `export` |
| Restaurar backup JSON | `import` |
| Limpar logs | `clear` ou `cls` |
| Remover todos os links | `clearlinks` ou `cl` |

`edit` e `remove` aceitam o nome completo, inclusive espaços, ou o ID mostrado em `list`. Nomes repetidos exigem o ID. Renomear um setor preserva seu ID e seus links; posições são contadas a partir de 1.

`clearlinks` apaga todos os links salvos e mantém setores e aliases. Importar um backup substitui os dados após confirmação, sem mesclar listas.

### Autocomplete

Digite parte de um comando, setor ou link para ver sugestões:

- **Tab:** aceita a sugestão selecionada ou a primeira.
- **Setas:** percorrem as sugestões.
- **Enter:** aceita a seleção; sem seleção, executa o comando.
- **Escape:** fecha a lista.
- Também é possível clicar na sugestão.

## Persistência e backup

Os dados ficam no **IndexedDB do navegador**, por origem: protocolo, domínio e porta. Persistem ao recarregar, fechar e reabrir o navegador e fazer novos deploys no mesmo endereço.

**As alterações não escrevem no JSON hospedado nem no repositório GitHub e não sincronizam entre dispositivos.** Para trocar de navegador ou domínio, execute `export` no antigo e `import` no novo. Limpar os dados do site ou apagar o perfil remove o armazenamento; sessões privadas são temporárias. Mantenha um backup.

`js/links.json` contém links, setores e aliases iniciais. Ele é importado somente quando ainda não há dados locais. Editá-lo depois não sobrescreve os dados já salvos, e esvaziar a lista não restaura automaticamente os links iniciais.

Limites do app: 50 setores, 1000 links, 100 aliases e arquivos de importação de até 5 MB.

## Estrutura publicada

| Caminho | Função |
| --- | --- |
| `index.html` | Estrutura da homepage |
| `manifest.webmanifest` | Metadados de apresentação do aplicativo |
| `assets/favicon.svg` | Ícone da versão atual |
| `css/styles.css` | Tema, efeitos e layout |
| `js/script.js` | Interface, comandos e integração com o Drive |
| `js/link-store.js` | Persistência no IndexedDB |
| `js/model.js` | Validação dos dados |
| `js/autocomplete.js` | Sugestões do terminal |
| `js/links.json` | Dados iniciais |
| `js/commandsList.json` | Catálogo e ajuda dos comandos |
| `js/log-lines.json` | Mensagens dos logs visuais |
| `js/drive-api-key.json` | Chave usada pelo navegador de pastas do Drive |

No projeto Firebase, esses arquivos ficam em `dist/`. Os testes opcionais ficam em `tests/`, fora da pasta publicada.

## Manifest

Coloque `manifest.webmanifest` ao lado do `index.html` e inclua no `<head>`:

```html
<link rel="manifest" href="./manifest.webmanifest">
```

Para combinar a cor da interface do navegador com o tema, ajuste a tag existente:

```html
<meta name="theme-color" content="#0C011F">
```

O manifest usa o ícone existente em `assets/favicon.svg`. Não referencia o antigo ícone maskable, ausente no pacote atualizado. Ele define apresentação `standalone`, mas não adiciona cache offline nem um service worker. A disponibilidade de instalação depende do navegador.

## Publicar

### GitHub Pages

Copie o conteúdo de `dist/` para a raiz publicada pelo Pages, incluindo o manifest. Preserve o `CNAME`, caso utilize domínio próprio. Faça commit/push e mantenha a branch e pasta configuradas em **Settings → Pages**. Não há etapa de build obrigatória.

### Firebase Hosting

Mantenha `hosting.public` apontando para `dist` e execute na raiz do projeto:

```sh
npx firebase deploy --only hosting
```

A homepage usa apenas hospedagem estática; a persistência local não exige Firestore, Functions ou mudança para o plano Blaze.

## Google Drive

Para a listagem de arquivos, configure uma chave com acesso à Google Drive API em `js/drive-api-key.json`, no formato `{"key":"SUA_CHAVE"}`. A chave usada no frontend é visível ao navegador: restrinja seu uso à API e aos endereços da homepage. Essa função lista conteúdo acessível pela API sem login e não concede acesso a pastas privadas.

## Testes

Na raiz do pacote atualizado, com Node instalado:

```sh
node --test tests/homepage.test.mjs
```

Os testes cobrem comandos, setores, aliases, sugestões, validação e falhas de gravação com armazenamento simulado. Node é opcional para testes e ferramentas de deploy; não é necessário para executar a homepage publicada.
