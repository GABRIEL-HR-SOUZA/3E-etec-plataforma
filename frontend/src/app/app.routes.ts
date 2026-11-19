import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { VagasListComponent } from './pages/vagas-list/vagas-list.component';
import { VagaDetailComponent } from './pages/vaga-detail/vaga-detail.component';
import { EmpresasInfoComponent } from './pages/empresas-info/empresas-info.component';
import { CadastroEmpresaComponent } from './pages/cadastro-empresa/cadastro-empresa.component';
import { PainelAlunoComponent } from './pages/painel-aluno/painel-aluno.component';
import { PainelEmpresaComponent } from './pages/painel-empresa/painel-empresa.component';
import { PainelEtecComponent } from './pages/painel-etec/painel-etec.component';
import { alunoGuard, empresaGuard, etecGuard } from './core/role.guard';
import { SobreComponent } from './pages/institucional/sobre.component';
import { CursosComponent } from './pages/institucional/cursos.component';
import { EditaisComponent } from './pages/institucional/editais.component';
import { AgendaComponent } from './pages/institucional/agenda.component';
import { NoticiasComponent } from './pages/institucional/noticias.component';
import { NoticiaDetalheComponent } from './pages/institucional/noticia-detalhe.component';
import { MulheresMilComponent } from './pages/institucional/mulheres-mil.component';
import { ContatoComponent } from './pages/institucional/contato.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'ETEC Cuiabá — Escola Técnica Estadual & Portal de Vagas' },
  { path: 'institucional', component: SobreComponent, title: 'Sobre a ETEC Cuiabá' },
  { path: 'cursos', component: CursosComponent, title: 'Cursos Técnicos — ETEC Cuiabá' },
  { path: 'editais', component: EditaisComponent, title: 'Editais e Processos Seletivos — ETEC Cuiabá' },
  { path: 'agenda', component: AgendaComponent, title: 'Agenda — ETEC Cuiabá' },
  { path: 'noticias', component: NoticiasComponent, title: 'Notícias — ETEC Cuiabá' },
  { path: 'noticias/:slug', component: NoticiaDetalheComponent, title: 'Notícia — ETEC Cuiabá' },
  { path: 'mulheres-mil', component: MulheresMilComponent, title: 'Programa Mulheres Mil — ETEC Cuiabá' },
  { path: 'contato', component: ContatoComponent, title: 'Fale Conosco — ETEC Cuiabá' },
  { path: 'vagas', component: VagasListComponent, title: 'Vagas e Estágios — ETEC Cuiabá' },
  { path: 'vagas/empresas', component: EmpresasInfoComponent, title: 'Para Empresas — Portal de Vagas ETEC Cuiabá' },
  { path: 'vagas/cadastro-empresa', component: CadastroEmpresaComponent, title: 'Cadastro de Empresa — ETEC Cuiabá' },
  { path: 'vagas/:id', component: VagaDetailComponent, title: 'Detalhe da Vaga — ETEC Cuiabá' },
  { path: 'painel/aluno', component: PainelAlunoComponent, canActivate: [alunoGuard], title: 'Painel do Aluno e Egresso — ETEC Cuiabá' },
  { path: 'painel/empresa', component: PainelEmpresaComponent, canActivate: [empresaGuard], title: 'Painel da Empresa — ETEC Cuiabá' },
  { path: 'painel/etec', component: PainelEtecComponent, canActivate: [etecGuard], title: 'Painel da Coordenação de Estágio — ETEC Cuiabá' },
  { path: '**', redirectTo: '' }
];
