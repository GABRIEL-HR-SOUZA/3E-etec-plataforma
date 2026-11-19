import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-empresas-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-background">
      <!-- Hero Para Empresas -->
      <section class="bg-[#0f2a52] text-white py-14 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-8">
            <span class="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-2">
              PARCERIA EMPRESA-ESCOLA · ETEC CUIABÁ / SECITECI-MT
            </span>
            <h1 class="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Contrate talentos técnicos formados para o mundo do trabalho em Cuiabá
            </h1>
            <p class="text-white/80 text-base sm:text-lg mt-4 max-w-2xl leading-relaxed">
              Divulgue gratuitamente vagas de estágio, emprego CLT, jovem aprendiz e temporário diretamente para alunos e egressos dos cursos técnicos da ETEC Cuiabá, com suporte da Coordenação de Estágio e emissão automatizada do Termo de Compromisso.
            </p>
            <div class="mt-7 flex flex-wrap gap-3">
              <a routerLink="/vagas/cadastro-empresa" class="btn bg-[#1E7F4A] text-white hover:bg-[#17643a] text-base">
                Cadastrar minha empresa gratuitamente →
              </a>
              <button type="button" (click)="auth.abrirModalLogin('Entre com o login da sua empresa.', '/painel/empresa')" class="btn bg-white text-[#1C4587] hover:bg-white/90">
                Já tenho cadastro — Acessar painel
              </button>
            </div>
          </div>

          <div class="lg:col-span-4 bg-white/5 border border-white/15 rounded-xl p-6 space-y-4">
            <h2 class="font-heading font-bold text-xl text-white">Por que anunciar na ETEC?</h2>
            <ul class="space-y-2.5 text-sm text-white/85">
              <li>✓ <strong>100% Gratuito:</strong> Serviço público oficial da SECITECI/MT.</li>
              <li>✓ <strong>Filtro por Curso e Módulo:</strong> Só recebe candidatos com o perfil técnico compatível.</li>
              <li>✓ <strong>Termo de Estágio em PDF:</strong> Gerado pelo sistema já adequado à Lei 11.788/2008.</li>
              <li>✓ <strong>Privacidade LGPD:</strong> Ambiente seguro e auditado pela escola.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Fluxo de Moderação em 2 Etapas (Diagrama da Arquitetura) -->
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <span class="eyebrow">COMO FUNCIONA A MODERAÇÃO DA ETEC</span>
        <h2 class="section-title mb-8">Nada vai ao ar sem duas aprovações da ETEC: a da empresa e a da vaga</h2>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div class="bg-white border border-border rounded-xl p-5 shadow-sm">
            <span class="w-8 h-8 rounded-full bg-[#1C4587] text-white font-bold text-sm inline-flex items-center justify-center mb-3">1</span>
            <h3 class="font-heading font-bold text-lg">Cadastro da Empresa</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Informe CNPJ, responsável e contato. A Coordenação da ETEC valida a idoneidade da empresa uma única vez.
            </p>
          </div>

          <div class="bg-white border border-border rounded-xl p-5 shadow-sm">
            <span class="w-8 h-8 rounded-full bg-[#1C4587] text-white font-bold text-sm inline-flex items-center justify-center mb-3">2</span>
            <h3 class="font-heading font-bold text-lg">Publicação da Vaga</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Preencha os 15 campos obrigatórios. O sistema valida a Lei do Estágio e a Coordenação aprova e avisa os alunos do curso.
            </p>
          </div>

          <div class="bg-white border border-border rounded-xl p-5 shadow-sm">
            <span class="w-8 h-8 rounded-full bg-[#1C4587] text-white font-bold text-sm inline-flex items-center justify-center mb-3">3</span>
            <h3 class="font-heading font-bold text-lg">Gestão de Candidatos</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Veja os currículos de quem se candidatou à sua vaga, mude status em lote (Em análise, Entrevista, Aprovado) e adicione notas internas.
            </p>
          </div>

          <div class="bg-white border border-border rounded-xl p-5 shadow-sm">
            <span class="w-8 h-8 rounded-full bg-[#1E7F4A] text-white font-bold text-sm inline-flex items-center justify-center mb-3">4</span>
            <h3 class="font-heading font-bold text-lg">Termo de Estágio em PDF</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Ao aprovar um estagiário, a ETEC confere matrícula, idade e carga horária e emite o Termo de Compromisso pronto para assinatura.
            </p>
          </div>
        </div>
      </section>

      <!-- Regras da Lei do Estágio (Lei 11.788/2008) e LGPD -->
      <section class="bg-muted/60 border-t border-border py-14">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="bg-white border border-border rounded-xl p-6">
            <span class="badge bg-[#1C4587]/10 text-[#1C4587] mb-2">Lei Federal nº 11.788/2008</span>
            <h3 class="font-heading font-bold text-xl mb-3">Regras obrigatórias do Estágio Técnico</h3>
            <ul class="space-y-2.5 text-sm text-foreground/85">
              <li>• <strong>Jornada máxima:</strong> até 6 horas diárias e 30 horas semanais para estudantes de educação profissional técnica.</li>
              <li>• <strong>Idade mínima:</strong> 16 anos completos (para menores de 18 anos, o Termo exige assinatura do responsável legal).</li>
              <li>• <strong>Bolsa e Auxílio-transporte:</strong> obrigatórios no estágio não obrigatório.</li>
              <li>• <strong>Duração máxima:</strong> até 2 anos na mesma empresa concedente.</li>
              <li>• <strong>Relatório Semestral:</strong> acompanhamento a cada 6 meses junto à Coordenação da ETEC.</li>
            </ul>
          </div>

          <div class="bg-white border border-border rounded-xl p-6">
            <span class="badge bg-purple-100 text-[#5C2D91] mb-2">Segurança, Ética e LGPD (Lei 13.709/2018)</span>
            <h3 class="font-heading font-bold text-xl mb-3">Compromissos da Empresa Parceira</h3>
            <ul class="space-y-2.5 text-sm text-foreground/85">
              <li>• <strong>Proibição absoluta de cobrança:</strong> vagas que cobrem qualquer valor do candidato (taxa, curso, kit) são recusadas e a empresa é bloqueada imediatamente.</li>
              <li>• <strong>Privacidade primeiro (LGPD):</strong> a empresa só visualiza os currículos dos alunos que se candidataram às vagas dela. Não há busca livre no banco de alunos.</li>
              <li>• <strong>Opção Confidencial:</strong> a empresa pode ocultar seu nome ao público na listagem; a Coordenação da ETEC sempre visualiza os dados reais.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `
})
export class EmpresasInfoComponent {
  auth = inject(AuthService);
}
