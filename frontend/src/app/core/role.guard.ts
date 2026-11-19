import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const alunoGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.usuario();
  if (u && (u.perfil === 'ALUNO' || u.perfil === 'EGRESSO')) {
    return true;
  }
  auth.abrirModalLogin('Entre com seu e-mail ou CPF de aluno/egresso para acessar o Painel do Aluno.', state.url);
  return router.parseUrl('/vagas');
};

export const empresaGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.usuario();
  if (u && u.perfil === 'EMPRESA') {
    return true;
  }
  auth.abrirModalLogin('Entre com o login da sua empresa para acessar o Painel da Empresa.', state.url);
  return router.parseUrl('/vagas/empresas');
};

export const etecGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.usuario();
  if (u && (u.perfil === 'COORDENACAO' || u.perfil === 'ADMIN')) {
    return true;
  }
  auth.abrirModalLogin('Entre com sua conta institucional (@secitec.mt.gov.br) para acessar o Painel da ETEC.', state.url);
  return router.parseUrl('/vagas');
};
