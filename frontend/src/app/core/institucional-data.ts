/**
 * Dados institucionais públicos e oficiais da ETEC Cuiabá (SECITECI-MT).
 * Fontes (consultadas em 18/11/2026):
 *  - https://www.secitec.mt.gov.br/en/etec-cuiab%C3%A1
 *  - https://sites.google.com/secitec.mt.gov.br/eteccuiaba (Início, Quem somos, Equipe, Cursos técnicos, Mulheres Mil)
 *  - Catálogo Nacional de Cursos Técnicos (MEC) para eixo tecnológico e carga horária mínima.
 * Conteúdo dinâmico (notícias, editais e agenda) vem da API /api/institucional.
 */

export const CONTATO = {
  endereco: 'Av. Gonçalo Antunes de Barros, S/N — Bairro Novo Mato Grosso',
  cidade: 'Cuiabá/MT',
  cep: '78058-743',
  referencia: 'Ao lado do antigo Centro de Ressocialização Carumbé',
  telefoneFixo: '(65) 3613-3900',
  telefoneFixoLink: 'tel:+556536133900',
  whatsapp: '(65) 9 9971-1176',
  whatsappLink: 'https://wa.me/5565999711176',
  celular2: '(65) 9 9285-9700',
  celular2Link: 'tel:+5565992859700',
  email: 'etecuiaba@secitec.mt.gov.br',
  instagram: '@eteccuiaba',
  instagramLink: 'https://www.instagram.com/eteccuiaba/',
  moodle: 'http://governo.neead.secitec.mt.gov.br/',
  siteOficial: 'https://sites.google.com/secitec.mt.gov.br/eteccuiaba/in%C3%ADcio',
  paginaSecitec: 'https://www.secitec.mt.gov.br/en/etec-cuiab%C3%A1',
  editaisSecitec: 'https://www.secitec.mt.gov.br/en/editais',
  mapaEmbed: 'https://www.google.com/maps?q=ETEC+Cuiab%C3%A1+Av.+Gon%C3%A7alo+Antunes+de+Barros+Cuiab%C3%A1+MT&output=embed',
  mapaLink: 'https://www.google.com/maps/search/?api=1&query=ETEC+Cuiab%C3%A1+Av.+Gon%C3%A7alo+Antunes+de+Barros+Cuiab%C3%A1+MT',
  secretaria: 'SECITECI — Palácio Paiaguás, Rua Des. Carlos Avalone, s/n, Centro Político Administrativo, CEP 78049-903, Cuiabá/MT'
};

export const HISTORIA = {
  leiCriacao: 'Lei Complementar nº 374, de 15 de dezembro de 2009',
  inauguracao: '29 de março de 2022',
  vocacao: 'Tecnologias da Informação',
  eixos: ['Informação e Comunicação', 'Ambiente e Saúde', 'Segurança', 'Recursos Naturais', 'Gestão e Negócios'],
  modalidades: [
    {
      nome: 'Concomitante intercomplementar',
      descricao: 'Para estudantes do Ensino Médio, em parceria com a Escola Militar Tiradentes: o aluno cursa o técnico junto com o médio.'
    },
    {
      nome: 'Concomitante / subsequente (noturno)',
      descricao: 'Para quem está cursando o 2º ano do Ensino Médio ou já concluiu o Ensino Médio. Aulas no período noturno.'
    },
    {
      nome: 'Cursos FIC e livres',
      descricao: 'Formação Inicial e Continuada, aperfeiçoamento e atualização, ofertados conforme as demandas locais.'
    }
  ]
};

export interface MembroEquipe { nome: string; cargo: string; email: string; grupo: 'Gestão' | 'Apoio pedagógico e administrativo'; }

export const EQUIPE: MembroEquipe[] = [
  { nome: 'Mateus de Souza Rocha', cargo: 'Diretor', email: 'mateusrocha@secitec.mt.gov.br', grupo: 'Gestão' },
  { nome: 'Marcus Rogério Fernandes', cargo: 'Coordenador de Integração Escola-Comunidade', email: 'marcusfernandes@secitec.mt.gov.br', grupo: 'Gestão' },
  { nome: 'Camilla Pereira Mendes', cargo: 'Coordenadora de Desenvolvimento Educacional', email: 'camillamendes@secitec.mt.gov.br', grupo: 'Gestão' },
  { nome: 'Regiane Andréia de Assis', cargo: 'Gerente de Apoio Pedagógico', email: 'regianeassis@secitec.mt.gov.br', grupo: 'Gestão' },
  { nome: 'Luciete de Almeida Prado', cargo: 'Assessora Técnica III', email: 'lucieteprado@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'Edmara Barros da Luz', cargo: 'Assistente Técnica I', email: 'edmaraluz@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'Rhayelle Monique Angela Rodrigues', cargo: 'Técnica de Apoio Educacional — Secretariado', email: 'rhayellerodrigues@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'João Leonardo Neves Valdez', cargo: 'Técnico de Apoio Educacional — Informática', email: 'joaovaldez@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'Dayene Andressa Xavier Viana dos Santos', cargo: 'Técnica de Apoio Educacional', email: 'dayenesantos@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'Mona Izi Araújo Cunha Taborelli', cargo: 'Técnica de Apoio Educacional', email: 'monataborelli@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'Alexsandra Benedita de Oliveira', cargo: 'Técnica Administrativa Educacional — Bibliotecária', email: 'alexsandraoliveira@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' },
  { nome: 'William Serdeira Garcia', cargo: 'Técnico Administrativo Educacional — Pedagogo', email: 'williamgarcia@secitec.mt.gov.br', grupo: 'Apoio pedagógico e administrativo' }
];

export interface CursoTecnico {
  slug: string;
  nome: string;
  eixo: string;
  cargaMinima: number; // horas — Catálogo Nacional de Cursos Técnicos (MEC)
  local: string;
  descricao: string;
  atuacao: string[];
}

export const CURSOS_TECNICOS: CursoTecnico[] = [
  {
    slug: 'desenvolvimento-de-sistemas', nome: 'Técnico em Desenvolvimento de Sistemas', eixo: 'Informação e Comunicação', cargaMinima: 1200,
    local: 'Sede — Cuiabá',
    descricao: 'Forma profissionais para analisar, projetar, programar, testar e manter sistemas computacionais, aplicações web e mobile e bancos de dados.',
    atuacao: ['Fábricas de software', 'Setores de TI de empresas e órgãos públicos', 'Startups', 'Trabalho autônomo']
  },
  {
    slug: 'informatica', nome: 'Técnico em Informática', eixo: 'Informação e Comunicação', cargaMinima: 1200,
    local: 'Sede — Cuiabá',
    descricao: 'Desenvolve programas, opera e configura sistemas operacionais, aplicativos e redes locais, e presta suporte a usuários.',
    atuacao: ['Suporte e help desk', 'Desenvolvimento de software', 'Empresas de serviços de informática']
  },
  {
    slug: 'redes-de-computadores', nome: 'Técnico em Redes de Computadores', eixo: 'Informação e Comunicação', cargaMinima: 1000,
    local: 'Sede — Cuiabá',
    descricao: 'Instala, configura e administra redes de computadores, serviços de rede, cabeamento estruturado e segurança da informação.',
    atuacao: ['Provedores de internet', 'Data centers', 'Setores de infraestrutura de TI']
  },
  {
    slug: 'manutencao-e-suporte-em-informatica', nome: 'Técnico em Manutenção e Suporte em Informática', eixo: 'Informação e Comunicação', cargaMinima: 1000,
    local: 'Sede — Cuiabá',
    descricao: 'Realiza manutenção preventiva e corretiva de computadores e periféricos, instala sistemas e presta suporte técnico.',
    atuacao: ['Assistências técnicas', 'Suporte de TI em empresas', 'Lojas de informática']
  },
  {
    slug: 'enfermagem', nome: 'Técnico em Enfermagem', eixo: 'Ambiente e Saúde', cargaMinima: 1200,
    local: 'Sede — Cuiabá',
    descricao: 'Atua na promoção, prevenção, recuperação e reabilitação da saúde, sob supervisão do enfermeiro, com estágio supervisionado obrigatório.',
    atuacao: ['Hospitais e clínicas', 'Unidades básicas de saúde', 'Home care e instituições de longa permanência']
  },
  {
    slug: 'seguranca-do-trabalho', nome: 'Técnico em Segurança do Trabalho', eixo: 'Segurança', cargaMinima: 1200,
    local: 'Sede — Cuiabá',
    descricao: 'Desenvolve ações de prevenção de acidentes e doenças ocupacionais, inspeciona ambientes e orienta sobre normas regulamentadoras (NRs).',
    atuacao: ['Indústria e construção civil', 'Agronegócio', 'Consultorias de SST', 'Órgãos públicos']
  },
  {
    slug: 'agronegocio', nome: 'Técnico em Agronegócio', eixo: 'Recursos Naturais', cargaMinima: 1000,
    local: 'Fora de sede — E.E. Nagib Saad, Agrovila das Palmeiras, Santo Antônio de Leverger/MT',
    descricao: 'Atua na gestão de propriedades e cadeias produtivas rurais, comercialização, planejamento e associativismo.',
    atuacao: ['Propriedades rurais', 'Cooperativas', 'Revendas e agroindústrias']
  },
  {
    slug: 'agricultura', nome: 'Técnico em Agricultura', eixo: 'Recursos Naturais', cargaMinima: 1200,
    local: 'Fora de sede — Agrovila das Palmeiras, Santo Antônio de Leverger/MT',
    descricao: 'Planeja e executa atividades de produção vegetal, manejo de solo, irrigação e controle fitossanitário de forma sustentável.',
    atuacao: ['Propriedades rurais', 'Assistência técnica e extensão rural', 'Cooperativas']
  }
];

export const MULHERES_MIL = {
  publico: 'Mulheres, preferencialmente em situação de vulnerabilidade social.',
  requisitos: ['Ser do sexo feminino', 'Ter 16 anos ou mais no momento da matrícula'],
  curso: 'Cuidadora de Idosos',
  cargaHoraria: '160 horas',
  duracao: 'Em média 3 meses e meio',
  modalidade: 'Presencial',
  horario: '3x na semana (segunda a quarta-feira), das 18h às 22h',
  valor: '100% gratuito',
  transporte: 'Vale-transporte MTU gratuito para Cuiabá e 50% para Várzea Grande',
  auxilio: 'R$ 2,00 por hora-aula (em média R$ 320,00 pelo curso todo)',
  fonte: 'https://sites.google.com/secitec.mt.gov.br/eteccuiaba/cursos-de-aperfei%C3%A7oamento/programa-mulheres-mil'
};

export const STATUS_EDITAL: Record<string, { label: string; classe: string }> = {
  aberto: { label: 'Inscrições abertas', classe: 'bg-emerald-100 text-emerald-800' },
  em_andamento: { label: 'Em andamento', classe: 'bg-[#1C4587]/10 text-[#1C4587]' },
  encerrado: { label: 'Encerrado', classe: 'bg-muted text-muted-foreground' }
};

/** Formata 'YYYY-MM-DD' como '18 de jun. de 2026' sem problemas de fuso. */
export function formatarData(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', opts);
}
