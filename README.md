# 3E ETEC — Plataforma de Vagas SECITEC

> **Plataforma web para conectar alunos da SECITEC a oportunidades de emprego e estágio, aproximando estudantes e empresas da região em um único ambiente digital.**

🔗 **Protótipo da plataforma:**
https://lovable.dev/projects/da5842de-8387-46af-835e-81cd3c57e60d?magic_link=mc_b2aafa06-d519-4092-a713-1a75549b80d0

---

## 📌 Sobre o Projeto

O **3E ETEC — Plataforma de Vagas SECITEC** é uma aplicação web desenvolvida com o objetivo de **facilitar a conexão entre alunos e empresas**, centralizando oportunidades de emprego e estágio em um único sistema.

A proposta é criar um ambiente simples, moderno e acessível, no qual os alunos possam encontrar oportunidades compatíveis com seus perfis e as empresas possam encontrar novos talentos de forma mais eficiente.

A plataforma possui diferentes funcionalidades de acordo com o tipo de usuário.

---

## 🎯 Objetivos

### Objetivo Geral

Desenvolver uma plataforma digital capaz de aproximar **alunos da SECITEC e empresas da região**, simplificando os processos de divulgação, busca e candidatura a vagas de emprego e estágio.

### Objetivos Específicos

* Facilitar o acesso dos alunos a oportunidades profissionais;
* Permitir a criação e manutenção de currículos;
* Centralizar vagas de emprego e estágio;
* Facilitar o processo de candidatura;
* Permitir que empresas publiquem e gerenciem suas vagas;
* Disponibilizar informações dos candidatos para as empresas;
* Tornar o processo de recrutamento mais organizado e acessível.

---

## 👨‍🎓 Funcionalidades para Alunos

Os alunos poderão utilizar a plataforma para:

* Criar e editar seu perfil profissional;
* Cadastrar informações pessoais e acadêmicas;
* Criar e atualizar o currículo;
* Visualizar vagas disponíveis;
* Pesquisar e filtrar oportunidades;
* Consultar detalhes das vagas;
* Realizar candidaturas;
* Acompanhar o status de suas candidaturas;
* Visualizar empresas e oportunidades disponíveis.

---

## 🏢 Funcionalidades para Empresas

As empresas poderão utilizar a plataforma para:

* Criar e gerenciar seu perfil empresarial;
* Publicar vagas de emprego e estágio;
* Definir requisitos para cada oportunidade;
* Editar ou encerrar vagas publicadas;
* Visualizar candidatos interessados;
* Consultar os perfis e currículos dos candidatos;
* Gerenciar as candidaturas recebidas;
* Alterar o status dos candidatos durante o processo seletivo.

---

## 🔐 Tipos de Usuário

A plataforma será estruturada principalmente em dois tipos de usuários:

| Usuário         | Principais funcionalidades                                            |
| --------------- | --------------------------------------------------------------------- |
| 👨‍🎓 **Aluno** | Perfil, currículo, busca de vagas e candidaturas                      |
| 🏢 **Empresa**  | Perfil empresarial, publicação de vagas e gerenciamento de candidatos |

---

## 🛠️ Tecnologias Utilizadas

O projeto utiliza tecnologias modernas para garantir uma aplicação organizada, escalável e de fácil manutenção.

### Backend

**Java + Quarkus**

Responsável pela construção da API, regras de negócio, autenticação, processamento das solicitações e comunicação com o banco de dados.

> O Quarkus é conhecido por seu foco em aplicações Java modernas, com baixo consumo de recursos e inicialização rápida.

### Frontend

**TypeScript**

Utilizado para desenvolver uma interface dinâmica, organizada e com maior segurança durante o desenvolvimento por meio da tipagem estática.

### Banco de Dados

**PostgreSQL**

Responsável pelo armazenamento e gerenciamento das informações da plataforma, incluindo:

* Usuários;
* Empresas;
* Alunos;
* Currículos;
* Vagas;
* Candidaturas;
* Status dos processos seletivos.

---

## 🏗️ Arquitetura do Sistema

A aplicação será organizada seguindo uma arquitetura baseada na separação entre frontend, backend e banco de dados.

```text
┌──────────────────────────────┐
│          FRONTEND            │
│        TypeScript            │
│                              │
│  Interface dos alunos        │
│  Interface das empresas     │
└──────────────┬───────────────┘
               │
               │ API / HTTP
               ▼
┌──────────────────────────────┐
│           BACKEND            │
│          Java + Quarkus      │
│                              │
│  Regras de negócio           │
│  Autenticação                │
│  Gerenciamento de vagas      │
│  Gerenciamento de usuários   │
│  Candidaturas                │
└──────────────┬───────────────┘
               │
               │ SQL
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
│                              │
│  Usuários                    │
│  Empresas                    │
│  Vagas                       │
│  Currículos                  │
│  Candidaturas                │
└──────────────────────────────┘
```

---

## 👥 Equipe de Desenvolvimento

| Integrante            | Função              | Principais responsabilidades                                                               |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| **Gabriel Henrique**  | Backend Developer   | Arquitetura da API, regras de negócio, desenvolvimento do backend e integração com Quarkus |
| **Moises Montezuma**  | Frontend Developer  | Desenvolvimento da interface, componentes, responsividade e experiência do usuário         |
| **Gabriel Carbonato** | Database Specialist | Modelagem do banco de dados, criação de tabelas, relacionamentos e otimização de consultas |

---

## 📂 Estrutura do Projeto

Uma possível organização do projeto:

```text
3E-etec-plataforma/
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── database/
│   ├── migrations/
│   └── scripts/
│
├── docs/
│   ├── arquitetura/
│   ├── diagramas/
│   └── requisitos/
│
├── docker-compose.yml
└── README.md
```

---

# ⚙️ Como Executar o Projeto

## 📋 Pré-requisitos

Antes de iniciar o projeto, certifique-se de possuir:

* **Java 17 ou superior**
* **Node.js**
* **NPM ou Yarn**
* **PostgreSQL**
* **Docker** *(opcional, recomendado para facilitar a configuração do banco)*
* **Git**

---

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/GABRIEL-HR-SOUZA/3E-etec-plataforma.git
```

Entre na pasta do projeto:

```bash
cd 3E-etec-plataforma
```

---

### 2. Configuração do Backend

Entre na pasta do backend:

```bash
cd backend
```

Execute o projeto utilizando o Maven:

```bash
./mvnw quarkus:dev
```

No Windows:

```bash
mvnw.cmd quarkus:dev
```

---

### 3. Configuração do Frontend

Em outro terminal:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

---

### 4. Banco de Dados

Configure as credenciais do PostgreSQL de acordo com as variáveis de ambiente utilizadas pelo projeto.

Exemplo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secitec
DB_USER=postgres
DB_PASSWORD=sua_senha
```

Caso o projeto utilize Docker, o banco poderá ser iniciado através do:

```bash
docker compose up -d
```

---

# 🔄 Fluxo Principal da Plataforma

### 👨‍🎓 Aluno

```text
Cadastro
   ↓
Criação do perfil
   ↓
Cadastro do currículo
   ↓
Busca por vagas
   ↓
Visualização da oportunidade
   ↓
Candidatura
   ↓
Acompanhamento do processo
```

### 🏢 Empresa

```text
Cadastro
   ↓
Criação do perfil empresarial
   ↓
Publicação da vaga
   ↓
Recebimento de candidaturas
   ↓
Análise dos candidatos
   ↓
Atualização do status
```

---

# 📈 Possíveis Evoluções

A plataforma poderá futuramente receber novas funcionalidades, como:

* Sistema de notificações;
* Recomendação de vagas com base no perfil do aluno;
* Filtros avançados de oportunidades;
* Sistema de mensagens entre empresa e candidato;
* Agendamento de entrevistas;
* Integração com e-mail;
* Dashboard para empresas;
* Dashboard para administradores da SECITEC;
* Relatórios de empregabilidade;
* Sistema de avaliações e feedbacks;
* Integração com outras plataformas de recrutamento.

---

# 🔒 Segurança

A plataforma deverá utilizar mecanismos de segurança para proteger os dados dos usuários, incluindo:

* Autenticação de usuários;
* Controle de acesso baseado no tipo de usuário;
* Proteção de informações pessoais;
* Criptografia de senhas;
* Validação de dados enviados pela aplicação;
* Controle de permissões para acesso às funcionalidades.

---

# 📊 Benefícios Esperados

A implantação da plataforma busca proporcionar:

### Para os alunos

* Maior facilidade para encontrar oportunidades;
* Centralização das vagas;
* Melhor apresentação do perfil profissional;
* Acompanhamento das candidaturas.

### Para as empresas

* Maior facilidade para divulgar oportunidades;
* Acesso a talentos da SECITEC;
* Organização das candidaturas;
* Redução da necessidade de processos manuais.

### Para a SECITEC

* Centralização das oportunidades profissionais;
* Aproximação entre instituição, alunos e empresas;
* Possibilidade de acompanhar indicadores de empregabilidade;
* Modernização do processo de conexão entre estudantes e mercado de trabalho.

---

# 📄 Status do Projeto

**Em desenvolvimento 🚧**

O projeto está sendo desenvolvido pela equipe **3E ETEC**, com foco na criação de uma plataforma funcional, moderna e preparada para conectar estudantes da SECITEC ao mercado de trabalho.

---

## 👨‍💻 Equipe

**3E ETEC**

* Gabriel Henrique — Backend
* Moises Montezuma — Frontend
* Gabriel Carbonato — Banco de Dados

---

## 📜 Licença

Este projeto foi desenvolvido para fins acadêmicos e educacionais pela equipe **3E ETEC**.
