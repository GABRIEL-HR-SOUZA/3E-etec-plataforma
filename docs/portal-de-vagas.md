# Portal de Vagas e Estágios — ETEC Cuiabá (SECITECI/MT)

Sistema completo do **Portal de Vagas e Estágios Moderado da Escola Técnica Estadual de Educação Profissional e Tecnológica de Cuiabá (ETEC/SECITECI-MT)**, construído com a identidade visual institucional da ETEC Cuiabá e seguindo integralmente a arquitetura especificada.

---

## 🏗️ Arquitetura e Stack Implementada

| Camada | Tecnologia | Implementação |
|---|---|---|
| **Front-end** | **Angular 19** (Componentes Standalone + Tailwind CSS) | Rotas com guards por perfil (`alunoGuard`, `empresaGuard`, `etecGuard`), `HttpInterceptor` que anexa o token JWT (`authInterceptor`), formulários reativos, layout 100% responsivo idêntico ao portal da ETEC Cuiabá (`etec-logo.png` e `hero-etec.jpg`). |
| **Back-end (API Central)** | **Java 21 + Quarkus 3.15** (Modo JVM) | API REST (`quarkus-rest-jackson`), validação de regras de negócio e da Lei do Estágio (`Lei 11.788/2008`), autenticação unificada JWT com hash `BCrypt`, tarefas agendadas diárias (`@Scheduled`), geração de PDF (`OpenPDF`) e documentação `SmallRye OpenAPI / Swagger UI`. |
| **Banco de Dados** | **SQLite** (`./backend/data/etec_vagas.db`) | Arquivo único com **13 tabelas principais** + tabelas de notificações, vagas salvas e base da secretaria; configurado automaticamente em modo **WAL (`PRAGMA journal_mode=WAL`)** e **`PRAGMA busy_timeout=5000`**, além de backup seguro online via `VACUUM INTO`. |
| **Armazenamento de PDFs** | Disco local privado (`./backend/storage/private_pdfs`) | Currículos em PDF (validados até 5 MB) e Termos de Compromisso de Estágio ficam fora da pasta pública e só são servidos após validação de permissão e registro em log de auditoria LGPD. |

---

## 🏫 Site Institucional (dados oficiais)

| Rota | Conteúdo | Origem dos dados |
|---|---|---|
| `/institucional` | História (LC 374/2009, inaugurada em 29/03/2022), formas de oferta, eixos e equipe gestora | `core/institucional-data.ts` |
| `/cursos` | Catálogo dos 8 cursos técnicos (eixo e carga mínima do CNCT/MEC) + vagas abertas por curso | estático + `/api/public/cursos` |
| `/editais` | Editais SECITECI/ETEC com filtros (status, categoria, busca) | `GET /api/institucional/editais` |
| `/agenda` | Próximos eventos e eventos realizados | `GET /api/institucional/agenda` |
| `/noticias` e `/noticias/:slug` | Notícias com busca e categoria | `GET /api/institucional/noticias` |
| `/mulheres-mil` | Programa Mulheres Mil (Cuidadora de Idosos, 160 h) | `core/institucional-data.ts` |
| `/contato` | Formulário Fale Conosco (grava no SQLite, gera protocolo, limite de 1 envio/min por IP) + mapa | `POST /api/institucional/contato` |

Notícias, editais e agenda são gerenciados no **Painel da ETEC → aba "Site institucional"**, que também mostra as mensagens do Fale Conosco. Os dados iniciais vêm de secitec.mt.gov.br e do site oficial da ETEC Cuiabá (consultados em 18/11/2026). A carga é feita em `InstitucionalSeed.java` e só roda quando as tabelas estão vazias.

---

## 🔑 Credenciais de Demonstração (Botão Unificado "Acessar")

A senha padrão de todas as contas de demonstração é **`123456`**. O campo único de login reconhece automaticamente quem está entrando:

| Perfil | O que digitar no campo "Login, e-mail ou CPF" | Dica exibida automaticamente | Painel de destino |
|---|---|---|---|
| **Aluno (CPF)** | `111.222.333-44` (ou `11122233344`) | *Entrando como aluno (CPF)* | `/painel/aluno` |
| **Aluno (E-mail)** | `aluno@etec.mt.gov.br` | *Entrando como aluno (e-mail)* | `/painel/aluno` |
| **Aluna Menor (<18 anos)** | `mariana.silva@aluno.etec.mt.gov.br` | *Entrando como aluno (e-mail)* | `/painel/aluno` (Termo exige assinatura do responsável) |
| **Egresso (Formado)** | `egresso@etec.mt.gov.br` (ou `33344455566`) | *Entrando como aluno (e-mail)* | `/painel/aluno` (Só vagas de emprego CLT/Temporário) |
| **Empresa Aprovada 1** | `cuiabadigital` | *Entrando como empresa* | `/painel/empresa` (Cuiabá Digital Tech) |
| **Empresa Aprovada 2** | `hospitalsantahelena` | *Entrando como empresa* | `/painel/empresa` (Hospital Santa Helena) |
| **Empresa Aprovada 3** | `agrochapadamt` | *Entrando como empresa* | `/painel/empresa` (AgroTech Chapada MT) |
| **Coordenação de Estágio** | `coordenacao@secitec.mt.gov.br` | *Entrando como aluno/institucional* | `/painel/etec` |
| **Administrador (TI)** | `admin@secitec.mt.gov.br` | *Entrando como aluno/institucional* | `/painel/etec` |

> **Teste de Primeiro Acesso do Aluno:** No modal **Acessar**, clique em **"Primeiro acesso do aluno"** e informe o CPF **`444.555.666-77`** e a Matrícula **`2026205`** (Lucas Oliveira Santos — Técnico em Agronegócio, pré-cadastrado na base da Secretaria).

---

## 🚀 Como Executar

Execute o script PowerShell na raiz do projeto:

```powershell
.\iniciar-portal.ps1
```

- **Front-end Angular:** http://localhost:4200
- **Back-end Quarkus API:** http://localhost:8080
- **Documentação Swagger UI (OpenAPI):** http://localhost:8080/q/swagger-ui
