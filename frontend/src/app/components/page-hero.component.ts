import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Cabeçalho padrão das páginas institucionais (faixa azul + trilha de navegação). */
@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="bg-[#0f2a52] text-white border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <nav aria-label="Trilha de navegação" class="text-[13px] text-white/60 mb-3">
          <a routerLink="/" class="hover:text-white hover:underline">Início</a>
          <span class="mx-1.5">/</span>
          <span class="text-white/85">{{ trilha() }}</span>
        </nav>
        @if (eyebrow()) {
          <span class="text-xs font-semibold uppercase tracking-widest text-emerald-400 block mb-1.5">{{ eyebrow() }}</span>
        }
        <h1 class="font-heading font-bold text-3xl sm:text-4xl leading-tight max-w-3xl">{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p class="text-white/80 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed">{{ subtitulo() }}</p>
        }
        <ng-content></ng-content>
      </div>
    </section>
  `
})
export class PageHeroComponent {
  titulo = input.required<string>();
  trilha = input.required<string>();
  eyebrow = input<string>('');
  subtitulo = input<string>('');
}
