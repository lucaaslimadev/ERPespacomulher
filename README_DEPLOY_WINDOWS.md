# ERP Espaço Mulher — Deploy no Windows

Este guia descreve como instalar e executar o ERP Espaço Mulher em uma máquina Windows usando Docker Desktop.

---

## 1. Pré-requisitos

### 1.1 Docker Desktop

- **Requisito obrigatório:** [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
- Versão recomendada: 4.18 ou superior
- Download: https://docs.docker.com/desktop/install/windows-install/

### 1.2 WSL2 (recomendado)

- Docker Desktop no Windows usa WSL2 por padrão
- Se o instalador solicitar, habilite WSL2 e instale o kernel de atualização
- WSL2 é necessário para melhor performance e compatibilidade

### 1.3 Portas utilizadas

O sistema expõe as seguintes portas:

| Porta | Serviço                  | Uso                         |
|-------|--------------------------|-----------------------------|
| 3000  | Aplicação Next.js        | Interface web do ERP        |
| 5433  | PostgreSQL (host)        | Acesso ao banco (opcional)  |

**Firewall:** Libere as portas **3000** e **5433** (TCP) para acesso à rede local, se outros computadores precisarem acessar o sistema.

---

## 2. Estrutura de pastas recomendada

Crie uma pasta para o projeto, por exemplo:

```
C:\Projetos\ERPespacomulher\
```

Ou, se usar WSL2 e preferir o sistema de arquivos Linux:

```
\\wsl$\Ubuntu\home\seu_usuario\ERPespacomulher\
```

**Importante:** Evite paths com espaços ou caracteres especiais (ex.: `C:\Meus Projetos`). Prefira `C:\Projetos\ERPespacomulher`.

---

## 3. Arquivos necessários para o deploy

Copie para a pasta do projeto **todos** os arquivos e pastas listados abaixo. Pode usar um pendrive, compartilhamento de rede ou repositório Git.

### 3.1 Arquivos na raiz

| Arquivo              | Obrigatório |
|----------------------|-------------|
| `Dockerfile`          | Sim         |
| `docker-compose.yml` | Sim         |
| `.dockerignore`       | Sim         |
| `.env.example`        | Sim         |
| `package.json`       | Sim         |
| `package-lock.json`  | Sim         |
| `next.config.js`     | Sim         |
| `tailwind.config.js` | Sim         |
| `postcss.config.js`  | Sim         |
| `tsconfig.json`      | Sim         |
| `.eslintrc.json`     | Opcional    |

### 3.2 Pastas completas

| Pasta        | Conteúdo principal                          |
|--------------|---------------------------------------------|
| `app/`       | Rotas e páginas da aplicação Next.js        |
| `components/`| Componentes React                           |
| `lib/`       | Utilitários, auth, middleware               |
| `public/`    | Arquivos estáticos (favicon, etc.)          |
| `prisma/`    | Schema e migrations do banco                |
| `scripts/`   | `docker-init.js` e outros scripts           |
| `types/`     | Tipos TypeScript                            |

### 3.3 Itens que **não** precisam ser copiados

- `node_modules/` — gerado no build
- `.next/` — gerado no build
- `.env` — criado localmente a partir do `.env.example`
- `tests/`, `docs/` — opcionais para deploy
- `.git/` — opcional

### 3.4 Resumo: comando para copiar (Git)

Se o projeto estiver em um repositório Git, clone no Windows:

```powershell
git clone https://github.com/SEU_USUARIO/ERPespacomulher.git
cd ERPespacomulher
```

---

## 4. Configuração

### 4.1 Criar o arquivo `.env`

1. Copie o arquivo de exemplo:
   ```powershell
   copy .env.example .env
   ```

2. Edite o `.env` com um editor de texto (Notepad, VS Code, etc.):
   ```powershell
   notepad .env
   ```

3. Configure as variáveis obrigatórias:

   ```env
   # Gere uma chave segura (32+ caracteres)
   JWT_SECRET="sua-chave-secreta-jwt-aqui-minimo-32-caracteres"

   # Usuário e senha do administrador (primeiro acesso)
   ADMIN_EMAIL="admin"
   ADMIN_PASSWORD="sua-senha-segura-aqui"

   # URL do banco (padrão Docker)
   DATABASE_URL="postgresql://erp:erp_senha_segura@localhost:5433/erp_espaco_mulher?schema=public"
   ```

4. **Segurança:**
   - Altere `JWT_SECRET` (ex.: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - Altere `ADMIN_PASSWORD` para uma senha forte

---

## 5. Passo a passo para subir o sistema

### 5.1 Abrir o terminal

- **PowerShell:** Clique com o botão direito na pasta do projeto → "Abrir no Terminal"  
- **CMD:** `cd C:\Projetos\ERPespacomulher`

### 5.2 Verificar o Docker

```powershell
docker --version
docker-compose --version
```

Ambos devem retornar versões. Se não, inicie o Docker Desktop e aguarde até que fique verde.

### 5.3 Subir os containers

```powershell
docker-compose up -d --build
```

Isso vai:
1. Baixar a imagem do PostgreSQL (se necessário)
2. Construir a imagem da aplicação
3. Subir banco e aplicação em segundo plano
4. Executar migrations e criar o usuário admin automaticamente

### 5.4 Verificar se está rodando

```powershell
docker-compose ps
```

Deve aparecer `erp-db` e `erp-app` com status `Up`.

### 5.5 Acessar o sistema

Abra o navegador em:

**http://localhost:3000**

Faça login com as credenciais configuradas em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`.

---

## 6. Comandos úteis

| Ação                | Comando                          |
|---------------------|-----------------------------------|
| Parar os serviços   | `docker-compose down`             |
| Ver logs da aplicação | `docker-compose logs -f app`   |
| Ver logs do banco   | `docker-compose logs -f db`       |
| Reiniciar serviços  | `docker-compose restart`          |
| Rebuild completo    | `docker-compose up -d --build`    |

---

## 7. Persistência de dados

Os dados do PostgreSQL são armazenados no volume Docker `postgres_data`.  
Mesmo ao executar `docker-compose down`, os dados permanecem.

Para **remover tudo**, inclusive dados:

```powershell
docker-compose down -v
```

**Atenção:** Isso apaga o banco de dados. Use só se quiser recomeçar do zero.

---

## 8. Build multi-arquitetura (opcional)

Para gerar imagens para **linux/amd64** e **linux/arm64** (ex.: registry, Raspberry Pi, etc.):

```powershell
.\scripts\build-multi-arch.ps1
```

Ou, para build apenas amd64 e uso local (Windows):

```powershell
docker buildx build --platform linux/amd64 -t erp-espaco-mulher:latest --load .
```

---

## 9. Reinício automático

O `docker-compose.yml` está configurado com `restart: always` para ambos os serviços. Em caso de reinício do Windows ou do Docker Desktop, os containers voltam a subir automaticamente.

---

## 10. Troubleshooting

### Porta 3000 ou 5433 já em uso

Altere as portas no `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"   # app em 3001
  - "5434:5432"   # db em 5434
```

Se alterar a porta do banco, atualize a `DATABASE_URL` no `.env` para `localhost:5434`.

### Docker Desktop não inicia

- Verifique se a virtualização está habilitada na BIOS
- Confirme que o WSL2 está instalado e atualizado: `wsl --update`

### Erro de permissão ao montar volumes

Execute o Docker Desktop como Administrador ou ajuste as permissões da pasta do projeto.

### "Cannot connect to the Docker daemon"

Inicie o Docker Desktop e aguarde até que o ícone indique que está rodando.

---

## 11. Checklist final

- [ ] Docker Desktop instalado e rodando
- [ ] WSL2 habilitado (se solicitado)
- [ ] Arquivos do projeto copiados na pasta correta
- [ ] Arquivo `.env` criado e configurado
- [ ] `JWT_SECRET` e `ADMIN_PASSWORD` alterados
- [ ] `docker-compose up -d --build` executado com sucesso
- [ ] Acesso em http://localhost:3000 funcionando

---

**Suporte:** Em caso de dúvidas, consulte a documentação do projeto ou a pasta `docs/`.
