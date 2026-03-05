import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { FilterBar } from './components/FilterBar'
import { TaskKanban } from './components/TaskKanban'
import { TaskCalendar } from './components/TaskCalendar'
import { TaskTable } from './components/TaskTable'
import { TaskModal } from './components/TaskModal'
import { TimeModal } from './components/TimeModal'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { UserManagement } from './components/UserManagement'
import { LoginScreen, type LoginCredenciais } from './components/LoginScreen'
import { ThemeToggle, useThemeInit } from './components/ThemeToggle'
import { ProfileModal } from './components/ProfileModal'
import { IconTasks, IconUsers, IconPlus, IconLogout, IconLayers } from './components/Icons'
import type { Filtros, Status, Tarefa, Usuario, UsuarioRole } from './types'
import { compararSenhaComHash, gerarHashSenha } from './utils/crypto'
import { enviarMensagemSms } from './utils/sms'
import { useUsuarios, useTarefas } from './hooks/useFirestore'
import {
  criarUsuarioApi,
  atualizarUsuarioApi,
  removerUsuarioApi,
  criarTarefaApi,
  atualizarTarefaApi,
  removerTarefaApi
} from './services/api'

const SESSION_STORAGE_KEY = 'pwa-daily-sessao'

type ModalTempoState =
  | { aberto: false }
  | { aberto: true; tarefa: Tarefa; statusAnterior?: Status }

type ModalTarefaState =
  | { aberto: false }
  | { aberto: true; tarefa: Tarefa | null }

const normalizarLogin = (valor: string) => valor.trim().toLowerCase()
const normalizarEmail = (valor: string) => valor.trim().toLowerCase()
const normalizarTelefone = (valor: string) => valor.replace(/\D/g, '')

function App() {
  useThemeInit()
  
  const { data: usuarios, loading: carregandoUsuarios, error: erroUsuarios } = useUsuarios()
  const { data: tarefas, loading: carregandoTarefas, error: erroTarefas } = useTarefas()
  
  const erroInicial = erroUsuarios || erroTarefas
  
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filtros, setFiltros] = useState<Filtros>({
    produto: 'TODOS',
    status: 'TODOS',
    data: hoje,
    atribuicoes: 'EU'
  })
  const [modo, setModo] = useState<ViewMode>('tabela')
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'tarefas' | 'usuarios'>('tarefas')
  const [erroLogin, setErroLogin] = useState<string | null>(null)
  const [processandoLogin, setProcessandoLogin] = useState(false)
  const [modalTarefa, setModalTarefa] = useState<ModalTarefaState>({ aberto: false })
  const [modalTempo, setModalTempo] = useState<ModalTempoState>({ aberto: false })
  const [modalPerfil, setModalPerfil] = useState(false)
  const ultimoUsuarioIdRef = useRef<string | null>(null)
  const sessaoRestaurada = useRef(false)

  useEffect(() => {
    if (carregandoUsuarios || sessaoRestaurada.current) return
    
    const loginPersistido =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(SESSION_STORAGE_KEY)
        : null

    if (loginPersistido) {
      const usuario = usuarios.find(
        (item) => item.login === loginPersistido && item.status === 'ATIVO'
      )
      if (usuario) {
        setUsuarioLogado(usuario)
      } else if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
    
    sessaoRestaurada.current = true
  }, [carregandoUsuarios, usuarios])

  useEffect(() => {
    if (!usuarioLogado) return
    const usuarioAtualizado = usuarios.find((usuario) => usuario.id === usuarioLogado.id)

    if (!usuarioAtualizado || usuarioAtualizado.status !== 'ATIVO') {
      setUsuarioLogado(null)
      setAbaAtiva('tarefas')
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
      return
    }

    if (
      usuarioAtualizado.nome !== usuarioLogado.nome ||
      usuarioAtualizado.email !== usuarioLogado.email ||
      usuarioAtualizado.status !== usuarioLogado.status ||
      usuarioAtualizado.role !== usuarioLogado.role ||
      usuarioAtualizado.senhaHash !== usuarioLogado.senhaHash
    ) {
      setUsuarioLogado(usuarioAtualizado)
    }
  }, [usuarios, usuarioLogado])

  useEffect(() => {
    if (usuarioLogado?.role !== 'ADMIN' && abaAtiva === 'usuarios') {
      setAbaAtiva('tarefas')
    }
  }, [usuarioLogado, abaAtiva])

  useEffect(() => {
    if (!usuarioLogado) {
      ultimoUsuarioIdRef.current = null
      setFiltros((atual) => ({
        ...atual,
        atribuicoes: 'TODOS'
      }))
      return
    }

    setFiltros((atual) => {
      let atribuicoesAtual: Filtros['atribuicoes'] = atual.atribuicoes

      if (atribuicoesAtual === 'TODOS') {
        if (ultimoUsuarioIdRef.current !== usuarioLogado.id) {
          atribuicoesAtual = 'EU'
        }
      } else if (atribuicoesAtual === 'EU') {
        atribuicoesAtual = 'EU'
      } else if (Array.isArray(atribuicoesAtual)) {
        const existentes = atribuicoesAtual.filter((id) =>
          usuarios.some((usuario) => usuario.id === id)
        )

        if (existentes.length === 0) {
          atribuicoesAtual = 'EU'
        } else {
          atribuicoesAtual = existentes
        }
      }

      ultimoUsuarioIdRef.current = usuarioLogado.id
      return { ...atual, atribuicoes: atribuicoesAtual }
    })
  }, [usuarioLogado, usuarios])

  const tarefasFiltradasPorCategoria = useMemo(() => {
    const idsFiltro =
      filtros.atribuicoes === 'TODOS'
        ? null
        : filtros.atribuicoes === 'EU'
          ? usuarioLogado?.id
            ? [usuarioLogado.id]
            : null
          : filtros.atribuicoes

    return tarefas.filter((tarefa) => {
      const produtoOk = filtros.produto === 'TODOS' || tarefa.produto === filtros.produto
      const statusOk = filtros.status === 'TODOS' || tarefa.status === filtros.status
      const atribuicaoOk =
        !idsFiltro || idsFiltro.length === 0
          ? true
          : tarefa.atribuidoIds.some((id) => idsFiltro.includes(id))
      return produtoOk && statusOk && atribuicaoOk
    })
  }, [tarefas, filtros.produto, filtros.status, filtros.atribuicoes, usuarioLogado?.id])

  const tarefasDoDia = useMemo(() => {
    return tarefasFiltradasPorCategoria.filter((tarefa) => tarefa.data === filtros.data)
  }, [tarefasFiltradasPorCategoria, filtros.data])

  const tarefasDoMes = useMemo(() => {
    const mesReferencia = filtros.data.slice(0, 7)
    return tarefasFiltradasPorCategoria.filter((tarefa) => tarefa.data.startsWith(mesReferencia))
  }, [tarefasFiltradasPorCategoria, filtros.data])

  const usuariosPorId = useMemo(() => {
    const mapa: Record<string, Usuario> = {}
    for (const usuario of usuarios) {
      mapa[usuario.id] = usuario
    }
    return mapa
  }, [usuarios])

  const handleLogout = () => {
    setUsuarioLogado(null)
    setAbaAtiva('tarefas')
    setModalTarefa({ aberto: false })
    setModalTempo({ aberto: false })
    setFiltros((atual) => ({
      ...atual,
      atribuicoes: 'TODOS'
    }))
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  const handleLogin = async ({ login, senha }: LoginCredenciais) => {
    setErroLogin(null)
    setProcessandoLogin(true)

    try {
      const loginNormalizado = normalizarLogin(login)
      const usuarioEncontrado = usuarios.find(
        (usuario) => normalizarLogin(usuario.login) === loginNormalizado
      )

      if (!usuarioEncontrado) {
        throw new Error('Login ou senha inválidos.')
      }

      const senhaValida = await compararSenhaComHash(senha, usuarioEncontrado.senhaHash)

      if (!senhaValida) {
        throw new Error('Login ou senha inválidos.')
      }

      if (usuarioEncontrado.status !== 'ATIVO') {
        throw new Error('Usuário inativo. Solicite a ativação ao administrador.')
      }

      setUsuarioLogado(usuarioEncontrado)
      setFiltros((atual) => ({
        ...atual,
        atribuicoes: 'EU'
      }))
      setAbaAtiva('tarefas')
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_STORAGE_KEY, usuarioEncontrado.login)
      }
    } catch (err) {
      if (err instanceof Error) {
        setErroLogin(err.message)
      } else {
        setErroLogin('Não foi possível realizar o login.')
      }
    } finally {
      setProcessandoLogin(false)
    }
  }

  const handleCriarUsuario = async (dados: {
    login: string
    nome: string
    email: string
    status: Usuario['status']
    role: UsuarioRole
    telefone: string
    senha?: string
  }) => {
    const loginNormalizado = normalizarLogin(dados.login)
    const emailNormalizado = normalizarEmail(dados.email)
    const telefoneNormalizado = normalizarTelefone(dados.telefone)

    if (
      usuarios.some((usuario) => normalizarLogin(usuario.login) === loginNormalizado)
    ) {
      throw new Error('Já existe um usuário com este login.')
    }

    if (
      usuarios.some((usuario) => normalizarEmail(usuario.email) === emailNormalizado)
    ) {
      throw new Error('Já existe um usuário com este e-mail.')
    }

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Informe um telefone válido com DDD (ex.: 5511999999999).')
    }

    const senhaHash = await gerarHashSenha(dados.senha ?? '')

    await criarUsuarioApi({
      login: dados.login.trim(),
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      telefone: telefoneNormalizado,
      status: dados.status,
      role: dados.role,
      senhaHash
    })
  }

  const handleAtualizarUsuario = async (
    id: string,
    dados: {
      login: string
      nome: string
      email: string
      status: Usuario['status']
      role: UsuarioRole
      telefone: string
      senha?: string
    }
  ) => {
    const usuarioExistente = usuarios.find((usuario) => usuario.id === id)
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado.')
    }

    const emailNormalizado = normalizarEmail(dados.email)
    const telefoneNormalizado = normalizarTelefone(dados.telefone)
    if (
      usuarios.some(
        (usuario) =>
          usuario.id !== id && normalizarEmail(usuario.email) === emailNormalizado
      )
    ) {
      throw new Error('Já existe um usuário com este e-mail.')
    }

    if (
      usuarioExistente.role === 'ADMIN' &&
      dados.role !== 'ADMIN' &&
      !usuarios.some((usuario) => usuario.id !== id && usuario.role === 'ADMIN')
    ) {
      throw new Error('Mantenha ao menos um usuário com perfil administrador.')
    }

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Informe um telefone válido com DDD (ex.: 5511999999999).')
    }

    const senhaHash =
      dados.senha && dados.senha.trim() ? await gerarHashSenha(dados.senha) : undefined

    await atualizarUsuarioApi(usuarioExistente.id, {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      telefone: telefoneNormalizado,
      status: dados.status,
      role: dados.role,
      ...(senhaHash ? { senhaHash } : {})
    })

    if (usuarioLogado?.id === id && dados.status !== 'ATIVO') {
      handleLogout()
    }
  }

  const handleSalvarPerfil = async (dados: {
    nome: string
    email: string
    telefone: string
    senha?: string
  }) => {
    if (!usuarioLogado) return

    const emailNormalizado = normalizarEmail(dados.email)
    const telefoneNormalizado = normalizarTelefone(dados.telefone)

    if (
      usuarios.some(
        (usuario) =>
          usuario.id !== usuarioLogado.id &&
          normalizarEmail(usuario.email) === emailNormalizado
      )
    ) {
      throw new Error('Já existe um usuário com este e-mail.')
    }

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Informe um telefone válido com DDD.')
    }

    const senhaHash =
      dados.senha && dados.senha.trim() ? await gerarHashSenha(dados.senha) : undefined

    await atualizarUsuarioApi(usuarioLogado.id, {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      telefone: telefoneNormalizado,
      ...(senhaHash ? { senhaHash } : {})
    })
  }

  const handleExcluirUsuario = async (id: string) => {
    const usuarioParaExcluir = usuarios.find((usuario) => usuario.id === id)
    if (!usuarioParaExcluir) {
      throw new Error('Usuário não encontrado.')
    }

    const restantes = usuarios.filter((usuario) => usuario.id !== id)
    const existeAtivo = restantes.some((usuario) => usuario.status === 'ATIVO')
    const existeAdmin = restantes.some((usuario) => usuario.role === 'ADMIN')

    if (usuarioParaExcluir.status === 'ATIVO' && !existeAtivo) {
      throw new Error('Não é possível excluir o último usuário ativo.')
    }

    if (usuarioParaExcluir.role === 'ADMIN' && !existeAdmin) {
      throw new Error('Não é possível excluir o último administrador.')
    }

    await removerUsuarioApi(id)

    if (usuarioLogado?.id === id) {
      handleLogout()
    }
  }

  const abrirModalTempo = (tarefa: Tarefa, statusAnterior?: Status) => {
    setModalTempo({ aberto: true, tarefa, statusAnterior })
  }

  const handleSalvarTarefa: React.ComponentProps<typeof TaskModal>['onSubmit'] = async (
    valores,
    tarefaOriginal
  ) => {
    try {
      const atribuidoIdsNormalizados = Array.from(
        new Set(
          (valores.atribuidoIds ?? []).filter((id): id is string =>
            usuarios.some((usuario) => usuario.id === id)
          )
        )
      )

      if (atribuidoIdsNormalizados.length === 0) {
        alert('Selecione ao menos um usuário responsável pela tarefa.')
        return
      }

      if (tarefaOriginal) {
        if (tarefaOriginal.status !== 'NOVO' && valores.status === 'NOVO') {
          alert('Uma tarefa que saiu de NOVO não pode retornar para NOVO.')
          return
        }

        if (tarefaOriginal.status === 'CONCLUIDO' && valores.status !== 'CONCLUIDO') {
          alert('Uma tarefa concluída não pode voltar para outro status.')
          return
        }

        await atualizarTarefaApi(tarefaOriginal.id, {
          titulo: valores.titulo.trim(),
          produto: valores.produto,
          status: valores.status,
          tempoTrabalhadoHoras: valores.tempoTrabalhadoHoras,
          observacoes: valores.observacoes?.trim()
            ? valores.observacoes.trim()
            : undefined,
          data: valores.data,
          atribuidoIds: atribuidoIdsNormalizados
        })

        setModalTarefa({ aberto: false })

        if (
          valores.status === 'CONCLUIDO' &&
          (valores.tempoTrabalhadoHoras === undefined ||
            Number.isNaN(valores.tempoTrabalhadoHoras))
        ) {
          abrirModalTempo({ ...tarefaOriginal, status: valores.status }, tarefaOriginal.status)
        }

        return
      }

      const novaTarefa = await criarTarefaApi({
        titulo: valores.titulo.trim(),
        produto: valores.produto,
        status: valores.status,
        tempoTrabalhadoHoras: valores.tempoTrabalhadoHoras,
        observacoes: valores.observacoes?.trim() ? valores.observacoes.trim() : undefined,
        data: valores.data,
        atribuidoIds: atribuidoIdsNormalizados
      })

      setModalTarefa({ aberto: false })

      if (
        novaTarefa.status === 'CONCLUIDO' &&
        (novaTarefa.tempoTrabalhadoHoras === undefined || Number.isNaN(novaTarefa.tempoTrabalhadoHoras))
      ) {
        abrirModalTempo(novaTarefa, 'NOVO')
      }

      if (usuarioLogado && atribuidoIdsNormalizados.includes(usuarioLogado.id)) {
        const numero = usuarioLogado.telefone?.replace(/\D/g, '')
        if (numero && numero.length >= 10) {
          const primeiroNome = usuarioLogado.nome.split(' ')[0]
          const dataFormatada = new Date(valores.data + 'T00:00:00').toLocaleDateString('pt-BR')
          const mensagem = `[Olá "${primeiroNome}", uma atividade nova foi atribuída para você: "${valores.titulo}" do projeto "${valores.produto}" programada para "${dataFormatada}"]`
          enviarMensagemSms({ numero, mensagem })
        }
      }
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
      alert(`Erro ao salvar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return
    await removerTarefaApi(id)
  }

  const handleAlterarStatus = async (id: string, status: Status) => {
    const tarefaAtual = tarefas.find((tarefa) => tarefa.id === id)
    if (!tarefaAtual || tarefaAtual.status === status) return

    if (tarefaAtual.status !== 'NOVO' && status === 'NOVO') {
      alert('Uma tarefa que saiu de NOVO não pode voltar para NOVO.')
      return
    }

    if (tarefaAtual.status === 'CONCLUIDO' && status !== 'CONCLUIDO') {
      alert('Uma tarefa concluída não pode voltar para outro status.')
      return
    }

    await atualizarTarefaApi(id, {
      titulo: tarefaAtual.titulo,
      produto: tarefaAtual.produto,
      status,
      tempoTrabalhadoHoras: tarefaAtual.tempoTrabalhadoHoras,
      observacoes: tarefaAtual.observacoes,
      data: tarefaAtual.data,
      atribuidoIds: tarefaAtual.atribuidoIds
    })

    if (status === 'CONCLUIDO') {
      if (
        tarefaAtual.tempoTrabalhadoHoras === undefined ||
        Number.isNaN(tarefaAtual.tempoTrabalhadoHoras)
      ) {
        abrirModalTempo({ ...tarefaAtual, status }, tarefaAtual.status)
      }
    }
  }

  const handleConfirmarTempo = async (tempoHoras: number) => {
    if (!modalTempo.aberto) return
    const tarefaModal = modalTempo.tarefa

    await atualizarTarefaApi(tarefaModal.id, {
      titulo: tarefaModal.titulo,
      produto: tarefaModal.produto,
      status: 'CONCLUIDO',
      tempoTrabalhadoHoras: tempoHoras,
      observacoes: tarefaModal.observacoes,
      data: tarefaModal.data,
      atribuidoIds: tarefaModal.atribuidoIds
    })

    setModalTempo({ aberto: false })
  }

  const handleCancelarTempo = async () => {
    if (!modalTempo.aberto) return
    const { tarefa, statusAnterior } = modalTempo

    if (statusAnterior && statusAnterior !== 'CONCLUIDO') {
      await atualizarTarefaApi(tarefa.id, {
        titulo: tarefa.titulo,
        produto: tarefa.produto,
        status: statusAnterior,
        tempoTrabalhadoHoras: tarefa.tempoTrabalhadoHoras,
        observacoes: tarefa.observacoes,
        data: tarefa.data,
        atribuidoIds: tarefa.atribuidoIds
      })
    }

    setModalTempo({ aberto: false })
  }

  if (erroInicial) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <p>{erroInicial}</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (carregandoUsuarios || carregandoTarefas) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="spinner" aria-hidden="true" />
          <p>Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!usuarioLogado) {
    return (
      <LoginScreen onSubmit={handleLogin} carregando={processandoLogin} erro={erroLogin} />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-brand">
            <div className="logo-icon">
              <IconLayers size={22} />
            </div>
            <h1>Daily Tasks</h1>
            <span className="app-version">v2.0</span>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="user-info"
              onClick={() => setModalPerfil(true)}
              title="Editar meu perfil"
            >
              <div className="user-avatar">
                {usuarioLogado.nome.charAt(0).toUpperCase()}
              </div>
              <span>{usuarioLogado.nome.split(' ')[0]}</span>
            </button>
            <ThemeToggle />
            <button className="button secondary" onClick={handleLogout}>
              <IconLogout size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>

        <div className="header-nav">
          <nav className="main-nav">
            <button
              type="button"
              className={`tab-button ${abaAtiva === 'tarefas' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('tarefas')}
            >
              <IconTasks size={16} />
              <span>Atividades</span>
            </button>
            {usuarioLogado.role === 'ADMIN' && (
              <button
                type="button"
                className={`tab-button ${abaAtiva === 'usuarios' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('usuarios')}
              >
                <IconUsers size={16} />
                <span>Usuários</span>
              </button>
            )}
          </nav>

          {abaAtiva === 'tarefas' && (
            <button
              className="button primary"
              onClick={() => setModalTarefa({ aberto: true, tarefa: null })}
              style={{ marginLeft: 'auto' }}
            >
              <IconPlus size={18} />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </header>

      <main className="app-content">
        {abaAtiva === 'tarefas' ? (
        <section className="panel">
            <div className="panel-header">
          <h2>Visualização</h2>
              <ViewToggle modo={modo} onChange={setModo} />
            </div>

            <FilterBar
              filtros={filtros}
              onChange={setFiltros}
              usuarios={usuarios}
              usuarioAtualId={usuarioLogado?.id}
            />

            {modo === 'tabela' && (
            <TaskTable
                tarefas={tarefasDoDia}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
              onExcluir={handleExcluir}
              onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
            />
            )}

            {modo === 'kanban' && (
            <TaskKanban
                tarefas={tarefasDoDia}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
                onExcluir={handleExcluir}
                onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
              />
            )}

            {modo === 'calendario' && (
              <TaskCalendar
                tarefasDoMes={tarefasDoMes}
                tarefasDoDia={tarefasDoDia}
                dataSelecionada={filtros.data}
                onChangeData={(novaData) => setFiltros((atual) => ({ ...atual, data: novaData }))}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
              onExcluir={handleExcluir}
              onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
            />
          )}
        </section>
        ) : (
          <section className="panel">
            <UserManagement
              usuarios={usuarios}
              usuarioAtual={usuarioLogado}
              onCreate={handleCriarUsuario}
              onUpdate={handleAtualizarUsuario}
              onDelete={handleExcluirUsuario}
            />
          </section>
        )}
      </main>

      <TimeModal
        aberto={modalTempo.aberto}
        valorAtual={modalTempo.aberto ? modalTempo.tarefa.tempoTrabalhadoHoras : undefined}
        onCancelar={handleCancelarTempo}
        onConfirmar={handleConfirmarTempo}
      />

      <TaskModal
        aberto={modalTarefa.aberto}
        tarefa={modalTarefa.aberto ? modalTarefa.tarefa : null}
        dataPadrao={filtros.data}
        usuarios={usuarios}
        usuarioAtualId={usuarioLogado?.id}
        onClose={() => setModalTarefa({ aberto: false })}
        onSubmit={handleSalvarTarefa}
      />

      <ProfileModal
        aberto={modalPerfil}
        usuario={usuarioLogado}
        onClose={() => setModalPerfil(false)}
        onSave={handleSalvarPerfil}
      />
    </div>
  )
}

export default App
