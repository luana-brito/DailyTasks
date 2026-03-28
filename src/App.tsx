import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import './App.css'
import { FilterBar } from './components/FilterBar'
import { ResumoTempoPanel } from './components/ResumoTempoPanel'
import { TaskKanban } from './components/TaskKanban'
import { TaskCalendar } from './components/TaskCalendar'
import { TaskTable } from './components/TaskTable'
import { TaskModal } from './components/TaskModal'
import { TimeModal } from './components/TimeModal'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { UserManagement } from './components/UserManagement'
import { LoginScreen, type LoginCredenciais } from './components/LoginScreen'
import { RegisterRequest } from './components/RegisterRequest'
import { ThemeToggle, useThemeInit } from './components/ThemeToggle'
import { ProfileModal } from './components/ProfileModal'
import { SettingsPage } from './components/SettingsPage'
import {
  IconTasks,
  IconUsers,
  IconPlus,
  IconLogout,
  IconLayers,
  IconSettings
} from './components/Icons'
import type { Executiva, Filtros, Status, Tarefa, Usuario, UsuarioRole, SolicitacaoCadastro } from './types'
import { truncarTituloTarefa } from './types'
import { enviarMensagemSms } from './utils/sms'
import { useUsuarios, useTarefas, useProdutos, useSolicitacoesCadastro } from './hooks/useFirestore'
import { useAuth } from './hooks/useAuth'
import {
  criarUsuarioFirestore,
  atualizarUsuarioApi,
  removerUsuarioApi,
  criarTarefaApi,
  atualizarTarefaApi,
  removerTarefaApi,
  criarProdutoApi,
  atualizarProdutoApi,
  removerProdutoApi,
  criarSolicitacaoApi,
  atualizarSolicitacaoApi
} from './services/api'
import {
  calcularMudancaStatusCronometro,
  segundosParaHoras,
  segundosTotaisCronometro
} from './lib/cronometro'
import { persistirConclusaoTarefa } from './lib/concluirTarefa'
import {
  calcularResumoTempoPorPeriodo,
  filtrarTarefasParaResumoTempo
} from './lib/resumoTempo'
import { normalizarObservacoesParaSalvar } from './lib/observacoesRichText'
import { hojeLocalISO } from './lib/datasLocal'

type ModalTempoState =
  | { aberto: false }
  | {
      aberto: true
      tarefa: Tarefa
      statusAnterior?: Status
      snapshotAntesConclusao?: Pick<
        Tarefa,
        'status' | 'cronometroSegundosAcumulados' | 'cronometroInicioEm' | 'tempoTrabalhadoHoras'
      >
      sugestaoTempoHoras?: number
    }

type ModalTarefaState =
  | { aberto: false }
  | { aberto: true; tarefa: Tarefa | null }

const normalizarEmail = (valor: string) => valor.trim().toLowerCase()
const normalizarTelefone = (valor: string) => valor.replace(/\D/g, '')

function App() {
  useThemeInit()
  
const {
    usuario: usuarioLogado,
    loading: carregandoAuth,
    error: erroAuth,
    login,
    logout,
    criarUsuarioAuth,
    alterarSenha,
    recuperarSenha
  } = useAuth()
  
  const { data: usuarios, loading: carregandoUsuarios, error: erroUsuarios } = useUsuarios()
  const { data: tarefas, loading: carregandoTarefas, error: erroTarefas } = useTarefas()
  const { data: produtos, loading: carregandoProdutos, error: erroProdutos } = useProdutos()
  const { data: solicitacoes, loading: carregandoSolicitacoes, error: erroSolicitacoes } = useSolicitacoesCadastro()
  
  const produtoPessoalRef = useRef(false)
  
  useEffect(() => {
    if (carregandoProdutos || produtoPessoalRef.current) return
    
    const existePessoal = produtos.some(p => p.nome === 'PESSOAL')
    if (!existePessoal) {
      produtoPessoalRef.current = true
      criarProdutoApi({ nome: 'PESSOAL', ativo: true }).catch(console.error)
    }
  }, [produtos, carregandoProdutos])
  
  const produtosAtivos = useMemo(() => produtos.filter(p => p.ativo), [produtos])
  
  const erroInicial = erroUsuarios || erroTarefas || erroProdutos || erroSolicitacoes
  
  const [filtros, setFiltros] = useState<Filtros>({
    produto: 'TODOS',
    status: 'TODOS',
    data: '',
    atribuicoes: 'EU'
  })
  /** Referência do mês/dia no calendário quando não há filtro por data na barra */
  const [calendarioRef, setCalendarioRef] = useState(() => hojeLocalISO())
  const [modo, setModo] = useState<ViewMode>('tabela')
  const [abaAtiva, setAbaAtiva] = useState<'tarefas' | 'usuarios' | 'configuracoes'>('tarefas')
  const [erroLogin, setErroLogin] = useState<string | null>(null)
  const [processandoLogin, setProcessandoLogin] = useState(false)
  const [telaAtual, setTelaAtual] = useState<'login' | 'solicitacao'>('login')
  const [modalTarefa, setModalTarefa] = useState<ModalTarefaState>({ aberto: false })
  const [modalTempo, setModalTempo] = useState<ModalTempoState>({ aberto: false })
  const [modalPerfil, setModalPerfil] = useState(false)
  const ultimoUsuarioIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (usuarioLogado?.role !== 'ADMIN' && (abaAtiva === 'usuarios' || abaAtiva === 'configuracoes')) {
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

  useEffect(() => {
    if (filtros.data) setCalendarioRef(filtros.data)
  }, [filtros.data])

  useEffect(() => {
    if (erroAuth) {
      setErroLogin(erroAuth)
    }
  }, [erroAuth])

  const tarefasVisiveis = useMemo(() => {
    return tarefas.filter((tarefa) => {
      if (tarefa.produto === 'PESSOAL') {
        return tarefa.criadoPorId === usuarioLogado?.id
      }
      return true
    })
  }, [tarefas, usuarioLogado?.id])

  /** Apenas tarefas raiz nas listas; subtarefas aparecem no modal da mãe */
  const tarefasRaizVisiveis = useMemo(
    () => tarefasVisiveis.filter((t) => !t.parentId),
    [tarefasVisiveis]
  )

  const contagemSubtarefasPorTarefaId = useMemo(() => {
    const map: Record<string, { total: number; concluidas: number }> = {}
    for (const t of tarefasVisiveis) {
      if (!t.parentId) continue
      if (!map[t.parentId]) map[t.parentId] = { total: 0, concluidas: 0 }
      map[t.parentId].total++
      if (t.status === 'CONCLUIDO') map[t.parentId].concluidas++
    }
    return map
  }, [tarefasVisiveis])

  const subtarefasPorParentId = useMemo(() => {
    const map: Record<string, Tarefa[]> = {}
    for (const t of tarefasVisiveis) {
      if (!t.parentId) continue
      if (!map[t.parentId]) map[t.parentId] = []
      map[t.parentId].push(t)
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => new Date(a.criadaEm).getTime() - new Date(b.criadaEm).getTime())
    }
    return map
  }, [tarefasVisiveis])

  const tarefasFiltradasPorCategoria = useMemo(() => {
    const idsFiltro =
      filtros.atribuicoes === 'TODOS'
        ? null
        : filtros.atribuicoes === 'EU'
          ? usuarioLogado?.id
            ? [usuarioLogado.id]
            : null
          : filtros.atribuicoes

    return tarefasRaizVisiveis.filter((tarefa) => {
      const produtoOk = filtros.produto === 'TODOS' || tarefa.produto === filtros.produto
      const statusOk = filtros.status === 'TODOS' || tarefa.status === filtros.status
      const atribuicaoOk =
        !idsFiltro || idsFiltro.length === 0
          ? true
          : tarefa.atribuidoIds.some((id) => idsFiltro.includes(id))
      return produtoOk && statusOk && atribuicaoOk
    })
  }, [tarefasRaizVisiveis, filtros.produto, filtros.status, filtros.atribuicoes, usuarioLogado?.id])

  const tarefasListaPrincipal = useMemo(() => {
    if (!filtros.data) return tarefasFiltradasPorCategoria
    return tarefasFiltradasPorCategoria.filter((tarefa) => tarefa.data === filtros.data)
  }, [tarefasFiltradasPorCategoria, filtros.data])

  const tarefasCalendarioDia = useMemo(() => {
    const d = filtros.data || calendarioRef
    return tarefasFiltradasPorCategoria.filter((tarefa) => tarefa.data === d)
  }, [tarefasFiltradasPorCategoria, filtros.data, calendarioRef])

  const tarefasDoMes = useMemo(() => {
    const ref = filtros.data || calendarioRef
    const mesReferencia = ref.slice(0, 7)
    return tarefasFiltradasPorCategoria.filter((tarefa) => tarefa.data.startsWith(mesReferencia))
  }, [tarefasFiltradasPorCategoria, filtros.data, calendarioRef])

  const tarefasParaResumoTempo = useMemo(
    () => filtrarTarefasParaResumoTempo(tarefasVisiveis, filtros, usuarioLogado?.id),
    [tarefasVisiveis, filtros.produto, filtros.status, filtros.atribuicoes, usuarioLogado?.id]
  )

  const resumoTempoTrabalhado = useMemo(() => {
    const refData = filtros.data || hojeLocalISO()
    return calcularResumoTempoPorPeriodo(tarefasParaResumoTempo, refData)
  }, [tarefasParaResumoTempo, filtros.data])

  const usuariosPorId = useMemo(() => {
    const mapa: Record<string, Usuario> = {}
    for (const usuario of usuarios) {
      mapa[usuario.id] = usuario
    }
    return mapa
  }, [usuarios])

  const handleLogout = async () => {
    await logout()
    setAbaAtiva('tarefas')
    setModalTarefa({ aberto: false })
    setModalTempo({ aberto: false })
    setFiltros((atual) => ({
      ...atual,
      atribuicoes: 'TODOS'
    }))
  }

  const handleLogin = async ({ login: email, senha }: LoginCredenciais) => {
    setErroLogin(null)
    setProcessandoLogin(true)

    try {
      await login(email, senha)
      setFiltros((atual) => ({
        ...atual,
        atribuicoes: 'EU',
        data: ''
      }))
      setCalendarioRef(hojeLocalISO())
      setAbaAtiva('tarefas')
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
    const emailNormalizado = normalizarEmail(dados.email)
    const telefoneNormalizado = normalizarTelefone(dados.telefone)

    if (
      usuarios.some((usuario) => normalizarEmail(usuario.email) === emailNormalizado)
    ) {
      throw new Error('Já existe um usuário com este e-mail.')
    }

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Informe um telefone válido com DDD (ex.: 5511999999999).')
    }

    if (!dados.senha || dados.senha.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.')
    }

    const uid = await criarUsuarioAuth(dados.email.trim(), dados.senha)

    await criarUsuarioFirestore(uid, {
      login: dados.email.trim(),
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      telefone: telefoneNormalizado,
      status: dados.status,
      role: dados.role
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

    const telefoneNormalizado = normalizarTelefone(dados.telefone)

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

    await atualizarUsuarioApi(usuarioExistente.id, {
      nome: dados.nome.trim(),
      telefone: telefoneNormalizado,
      status: dados.status,
      role: dados.role
    })

    if (usuarioLogado?.id === id && dados.status !== 'ATIVO') {
      handleLogout()
    }
  }

  const handleSalvarPerfil = async (dados: {
    nome: string
    telefone: string
    senhaAtual?: string
    novaSenha?: string
  }) => {
    if (!usuarioLogado) return

    const telefoneNormalizado = normalizarTelefone(dados.telefone)

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Informe um telefone válido com DDD.')
    }

    if (dados.novaSenha && dados.senhaAtual) {
      await alterarSenha(dados.senhaAtual, dados.novaSenha)
    }

    await atualizarUsuarioApi(usuarioLogado.id, {
      nome: dados.nome.trim(),
      telefone: telefoneNormalizado
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

  const handleCriarProduto = async (dados: { nome: string; executiva: Executiva }) => {
    await criarProdutoApi({ nome: dados.nome, executiva: dados.executiva, ativo: true })
  }

  const handleAtualizarProduto = async (id: string, dados: { nome?: string; executiva?: Executiva; ativo?: boolean }) => {
    await atualizarProdutoApi(id, dados)
  }

  const handleRemoverProduto = async (id: string) => {
    const produtoEmUso = tarefas.some(t => t.produto === produtos.find(p => p.id === id)?.nome)
    if (produtoEmUso) {
      throw new Error('Este produto está em uso por tarefas existentes e não pode ser removido.')
    }
    await removerProdutoApi(id)
  }

  const handleSolicitarCadastro = async (dados: {
    nome: string
    email: string
    telefone: string
    motivo?: string
  }) => {
    const emailNormalizado = normalizarEmail(dados.email)
    
    if (usuarios.some(u => normalizarEmail(u.email) === emailNormalizado)) {
      throw new Error('Já existe um usuário com este e-mail.')
    }
    
    await criarSolicitacaoApi(dados)
  }

  const handleAprovarSolicitacao = async (solicitacao: SolicitacaoCadastro, senha: string) => {
    const emailNormalizado = normalizarEmail(solicitacao.email)
    
    if (usuarios.some(u => normalizarEmail(u.email) === emailNormalizado)) {
      throw new Error('Já existe um usuário com este e-mail.')
    }

    const uid = await criarUsuarioAuth(solicitacao.email, senha)

    await criarUsuarioFirestore(uid, {
      login: solicitacao.email,
      nome: solicitacao.nome,
      email: solicitacao.email,
      telefone: solicitacao.telefone,
      status: 'ATIVO',
      role: 'USUARIO'
    })

    await atualizarSolicitacaoApi(solicitacao.id, 'APROVADO')
  }

  const handleRecusarSolicitacao = async (id: string) => {
    await atualizarSolicitacaoApi(id, 'RECUSADO')
  }

  const handleCriarSubtarefa = async (mae: Tarefa, titulo: string) => {
    if (mae.parentId) {
      throw new Error('Não é possível criar subtarefa de uma subtarefa.')
    }
    const atribuidoIds =
      mae.atribuidoIds.length > 0
        ? [...mae.atribuidoIds]
        : usuarioLogado?.id
          ? [usuarioLogado.id]
          : []
    if (atribuidoIds.length === 0) {
      throw new Error('A tarefa mãe precisa de pelo menos um responsável.')
    }

    await criarTarefaApi({
      titulo: truncarTituloTarefa(titulo),
      produto: mae.produto,
      status: 'NOVO',
      prioridade: mae.prioridade,
      data: mae.data,
      atribuidoIds,
      criadoPorId: usuarioLogado?.id ?? '',
      parentId: mae.id
    })
  }

  const abrirModalTempo = (
    tarefa: Tarefa,
    statusAnterior?: Status,
    snapshotAntesConclusao?: Pick<
      Tarefa,
      'status' | 'cronometroSegundosAcumulados' | 'cronometroInicioEm' | 'tempoTrabalhadoHoras'
    >,
    sugestaoTempoHoras?: number
  ) => {
    setModalTempo({
      aberto: true,
      tarefa,
      statusAnterior,
      snapshotAntesConclusao,
      sugestaoTempoHoras
    })
  }

  /** Quando todas as subtarefas estão concluídas, conclui a tarefa mãe (com modal de tempo se faltar). */
  const tentarConcluirTarefaMaeSeSubtarefasOk = async (
    parentId: string,
    subtarefaId: string,
    novoStatus: Status
  ) => {
    const irmaos = tarefas.filter((t) => t.parentId === parentId)
    if (irmaos.length === 0) return

    const todosConcluidos = irmaos.every((t) =>
      t.id === subtarefaId ? novoStatus === 'CONCLUIDO' : t.status === 'CONCLUIDO'
    )
    if (!todosConcluidos) return

    const mae = tarefas.find((t) => t.id === parentId)
    if (!mae || mae.parentId || mae.status === 'CONCLUIDO') return

    const cron = calcularMudancaStatusCronometro(mae, 'CONCLUIDO')
    await atualizarTarefaApi(
      parentId,
      {
        titulo: mae.titulo,
        produto: mae.produto,
        prioridade: mae.prioridade,
        observacoes: mae.observacoes,
        data: mae.data,
        atribuidoIds: mae.atribuidoIds,
        ...cron.patch
      },
      { removerCronometroInicio: cron.removerCronometroInicio }
    )

    if (cron.precisaModalTempo) {
      abrirModalTempo(
        { ...mae, status: 'CONCLUIDO', ...cron.patch },
        mae.status,
        cron.snapshotAntesConclusao,
        segundosParaHoras(segundosTotaisCronometro(mae))
      )
    }
  }

  const confirmarEConcluirSubtarefasPendentes = useCallback(
    async (maeId: string): Promise<boolean> => {
      const filhas = tarefas.filter((x) => x.parentId === maeId)
      const pendentes = filhas.filter((f) => f.status !== 'CONCLUIDO')
      if (pendentes.length === 0) return true
      if (
        !confirm(
          `Esta tarefa possui ${pendentes.length} subtarefa(s) ainda não concluída(s). Ao concluir a tarefa mãe, todas serão marcadas como concluídas automaticamente. Subtarefas sem tempo no cronômetro ficarão com 0 h (você pode editar depois no modal da tarefa). Deseja continuar?`
        )
      ) {
        return false
      }
      for (const f of pendentes) {
        await persistirConclusaoTarefa(f, { forcarTempoZeroSeNecessario: true })
      }
      return true
    },
    [tarefas]
  )

  const notificarSmsNovaTarefaSeEuAtribuido = useCallback(
    (atribuidoIds: string[], titulo: string, produto: string, data: string) => {
      if (!usuarioLogado || !atribuidoIds.includes(usuarioLogado.id)) return
      const numero = usuarioLogado.telefone?.replace(/\D/g, '')
      if (!numero || numero.length < 10) return
      const primeiroNome = usuarioLogado.nome.split(' ')[0]
      const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
      const mensagem = `[Olá "${primeiroNome}", uma atividade nova foi atribuída para você: "${titulo}" do projeto "${produto}" programada para "${dataFormatada}"]`
      enviarMensagemSms({ numero, mensagem })
    },
    [usuarioLogado]
  )

  const handleSalvarTarefa: ComponentProps<typeof TaskModal>['onSubmit'] = async (
    valores,
    tarefaOriginal,
    continuar
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

        const baseUpdate = {
          titulo: truncarTituloTarefa(valores.titulo),
          produto: valores.produto,
          prioridade: valores.prioridade,
          observacoes: normalizarObservacoesParaSalvar(valores.observacoes),
          data: valores.data,
          atribuidoIds: atribuidoIdsNormalizados
        }

        if (valores.status !== tarefaOriginal.status) {
          if (valores.status === 'CONCLUIDO' && !tarefaOriginal.parentId) {
            const okSubs = await confirmarEConcluirSubtarefasPendentes(tarefaOriginal.id)
            if (!okSubs) return
          }

          const cron = calcularMudancaStatusCronometro(tarefaOriginal, valores.status)
          const finalPatch = { ...cron.patch }
          let remover = cron.removerCronometroInicio
          let precisaModal = cron.precisaModalTempo
          if (
            valores.status === 'CONCLUIDO' &&
            valores.tempoTrabalhadoHoras != null &&
            !Number.isNaN(valores.tempoTrabalhadoHoras)
          ) {
            finalPatch.tempoTrabalhadoHoras = valores.tempoTrabalhadoHoras
            finalPatch.cronometroSegundosAcumulados = 0
            remover = true
            precisaModal = false
          }

          await atualizarTarefaApi(
            tarefaOriginal.id,
            { ...baseUpdate, ...finalPatch },
            { removerCronometroInicio: remover }
          )

          setModalTarefa({ aberto: false })

          if (precisaModal) {
            abrirModalTempo(
              { ...tarefaOriginal, ...finalPatch, status: 'CONCLUIDO' },
              tarefaOriginal.status,
              cron.snapshotAntesConclusao,
              segundosParaHoras(segundosTotaisCronometro(tarefaOriginal))
            )
          } else if (valores.status === 'CONCLUIDO' && tarefaOriginal.parentId) {
            await tentarConcluirTarefaMaeSeSubtarefasOk(
              tarefaOriginal.parentId,
              tarefaOriginal.id,
              'CONCLUIDO'
            )
          }

          return
        }

        await atualizarTarefaApi(tarefaOriginal.id, {
          ...baseUpdate,
          status: valores.status,
          tempoTrabalhadoHoras: valores.tempoTrabalhadoHoras
        })

        setModalTarefa({ aberto: false })

        if (valores.status === 'CONCLUIDO' && tarefaOriginal.parentId) {
          await tentarConcluirTarefaMaeSeSubtarefasOk(
            tarefaOriginal.parentId,
            tarefaOriginal.id,
            'CONCLUIDO'
          )
        }

        return
      }

      const cronNova: Partial<Tarefa> = {}
      if (valores.status === 'EM ANDAMENTO') {
        cronNova.cronometroSegundosAcumulados = 0
        cronNova.cronometroInicioEm = new Date().toISOString()
      }

      const novaTarefa = await criarTarefaApi({
        titulo: truncarTituloTarefa(valores.titulo),
        produto: valores.produto,
        status: valores.status,
        prioridade: valores.prioridade,
        tempoTrabalhadoHoras: valores.tempoTrabalhadoHoras,
        observacoes: normalizarObservacoesParaSalvar(valores.observacoes),
        data: valores.data,
        atribuidoIds: atribuidoIdsNormalizados,
        criadoPorId: usuarioLogado?.id ?? '',
        ...cronNova
      })

      if (!continuar) {
        setModalTarefa({ aberto: false })
      }

      if (
        novaTarefa.status === 'CONCLUIDO' &&
        (novaTarefa.tempoTrabalhadoHoras === undefined || Number.isNaN(novaTarefa.tempoTrabalhadoHoras))
      ) {
        abrirModalTempo(novaTarefa, 'NOVO')
      }

      notificarSmsNovaTarefaSeEuAtribuido(
        atribuidoIdsNormalizados,
        truncarTituloTarefa(valores.titulo),
        valores.produto,
        valores.data
      )
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
      alert(`Erro ao salvar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleExcluir = async (id: string) => {
    const filhas = tarefas.filter((t) => t.parentId === id)
    const msg =
      filhas.length > 0
        ? `Esta tarefa tem ${filhas.length} subtarefa(s). Tudo será excluído. Deseja continuar?`
        : 'Deseja realmente excluir esta tarefa?'
    if (!confirm(msg)) return
    for (const f of filhas) {
      await removerTarefaApi(f.id)
    }
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

    if (status === 'CONCLUIDO' && !tarefaAtual.parentId) {
      const okSubs = await confirmarEConcluirSubtarefasPendentes(tarefaAtual.id)
      if (!okSubs) return
    }

    const cron = calcularMudancaStatusCronometro(tarefaAtual, status)

    await atualizarTarefaApi(
      id,
      {
        titulo: tarefaAtual.titulo,
        produto: tarefaAtual.produto,
        prioridade: tarefaAtual.prioridade,
        observacoes: tarefaAtual.observacoes,
        data: tarefaAtual.data,
        atribuidoIds: tarefaAtual.atribuidoIds,
        ...cron.patch
      },
      { removerCronometroInicio: cron.removerCronometroInicio }
    )

    if (status === 'CONCLUIDO') {
      if (cron.precisaModalTempo) {
        abrirModalTempo(
          { ...tarefaAtual, ...cron.patch, status: 'CONCLUIDO' },
          tarefaAtual.status,
          cron.snapshotAntesConclusao,
          segundosParaHoras(segundosTotaisCronometro(tarefaAtual))
        )
      } else if (tarefaAtual.parentId) {
        await tentarConcluirTarefaMaeSeSubtarefasOk(tarefaAtual.parentId, id, 'CONCLUIDO')
      }
    }
  }

  const handleConfirmarTempo = async (tempoHoras: number) => {
    if (!modalTempo.aberto) return
    const tarefaModal = modalTempo.tarefa

    await atualizarTarefaApi(
      tarefaModal.id,
      {
        titulo: tarefaModal.titulo,
        produto: tarefaModal.produto,
        prioridade: tarefaModal.prioridade,
        status: 'CONCLUIDO',
        tempoTrabalhadoHoras: tempoHoras,
        observacoes: tarefaModal.observacoes,
        data: tarefaModal.data,
        atribuidoIds: tarefaModal.atribuidoIds,
        cronometroSegundosAcumulados: 0
      },
      { removerCronometroInicio: true }
    )

    setModalTempo({ aberto: false })

    if (tarefaModal.parentId) {
      await tentarConcluirTarefaMaeSeSubtarefasOk(tarefaModal.parentId, tarefaModal.id, 'CONCLUIDO')
    }
  }

  const handleCancelarTempo = async () => {
    if (!modalTempo.aberto) return
    const { tarefa, statusAnterior, snapshotAntesConclusao } = modalTempo

    if (statusAnterior && statusAnterior !== 'CONCLUIDO') {
      if (snapshotAntesConclusao) {
        const patch: Parameters<typeof atualizarTarefaApi>[1] = {
          titulo: tarefa.titulo,
          produto: tarefa.produto,
          prioridade: tarefa.prioridade,
          status: snapshotAntesConclusao.status,
          cronometroSegundosAcumulados: snapshotAntesConclusao.cronometroSegundosAcumulados ?? 0,
          tempoTrabalhadoHoras: snapshotAntesConclusao.tempoTrabalhadoHoras,
          observacoes: tarefa.observacoes,
          data: tarefa.data,
          atribuidoIds: tarefa.atribuidoIds
        }
        if (snapshotAntesConclusao.cronometroInicioEm) {
          patch.cronometroInicioEm = snapshotAntesConclusao.cronometroInicioEm
        }
        await atualizarTarefaApi(tarefa.id, patch, {
          removerCronometroInicio: !snapshotAntesConclusao.cronometroInicioEm
        })
      } else {
        await atualizarTarefaApi(tarefa.id, {
          titulo: tarefa.titulo,
          produto: tarefa.produto,
          prioridade: tarefa.prioridade,
          status: statusAnterior,
          tempoTrabalhadoHoras: tarefa.tempoTrabalhadoHoras,
          observacoes: tarefa.observacoes,
          data: tarefa.data,
          atribuidoIds: tarefa.atribuidoIds
        })
      }
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

  if (carregandoAuth || carregandoUsuarios || carregandoTarefas || carregandoProdutos || carregandoSolicitacoes) {
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
    if (telaAtual === 'solicitacao') {
      return (
        <RegisterRequest
          onSubmit={handleSolicitarCadastro}
          onVoltar={() => setTelaAtual('login')}
        />
      )
    }
    
    return (
      <LoginScreen 
        onSubmit={handleLogin} 
        onRecuperarSenha={recuperarSenha}
        carregando={processandoLogin} 
        erro={erroLogin}
        onSolicitarCadastro={() => setTelaAtual('solicitacao')}
      />
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
              aria-label="Atividades"
            >
              <IconTasks size={16} />
              <span>Atividades</span>
            </button>
            {usuarioLogado.role === 'ADMIN' && (
              <>
                <button
                  type="button"
                  className={`tab-button ${abaAtiva === 'usuarios' ? 'active' : ''}`}
                  onClick={() => setAbaAtiva('usuarios')}
                  aria-label="Usuários"
                >
                  <IconUsers size={16} />
                  <span>Usuários</span>
                  {solicitacoes.length > 0 && (
                    <span className="badge-notification">{solicitacoes.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`tab-button ${abaAtiva === 'configuracoes' ? 'active' : ''}`}
                  onClick={() => setAbaAtiva('configuracoes')}
                  aria-label="Configurações"
                >
                  <IconSettings size={16} />
                  <span>Configurações</span>
                </button>
              </>
            )}
          </nav>

          {abaAtiva === 'tarefas' && (
            <button
              type="button"
              className="button primary"
              onClick={() => setModalTarefa({ aberto: true, tarefa: null })}
              style={{ marginLeft: 'auto' }}
              aria-label="Nova tarefa"
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
              produtos={produtosAtivos}
            />

            <ResumoTempoPanel
              horasDia={resumoTempoTrabalhado.horasDia}
              horasSemana={resumoTempoTrabalhado.horasSemana}
              horasMes={resumoTempoTrabalhado.horasMes}
              semanaInicio={resumoTempoTrabalhado.semanaInicio}
              semanaFim={resumoTempoTrabalhado.semanaFim}
              mesAno={resumoTempoTrabalhado.mesAno}
            />

            {modo === 'tabela' && (
            <TaskTable
                tarefas={tarefasListaPrincipal}
                contagemSubtarefasPorTarefaId={contagemSubtarefasPorTarefaId}
                subtarefasPorParentId={subtarefasPorParentId}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
              onExcluir={handleExcluir}
              onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
            />
            )}

            {modo === 'kanban' && (
            <TaskKanban
                tarefas={tarefasListaPrincipal}
                contagemSubtarefasPorTarefaId={contagemSubtarefasPorTarefaId}
                subtarefasPorParentId={subtarefasPorParentId}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
                onExcluir={handleExcluir}
                onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
              />
            )}

            {modo === 'calendario' && (
              <TaskCalendar
                tarefasDoMes={tarefasDoMes}
                tarefasDoDia={tarefasCalendarioDia}
                contagemSubtarefasPorTarefaId={contagemSubtarefasPorTarefaId}
                subtarefasPorParentId={subtarefasPorParentId}
                dataSelecionada={filtros.data || calendarioRef}
                onChangeData={(novaData) =>
                  setFiltros((atual) => ({ ...atual, data: novaData }))
                }
                onNavegarMes={(primeiroDiaMes) => setCalendarioRef(primeiroDiaMes)}
                onEditar={(tarefa) => setModalTarefa({ aberto: true, tarefa })}
              onExcluir={handleExcluir}
              onAlterarStatus={handleAlterarStatus}
                usuariosPorId={usuariosPorId}
            />
          )}
        </section>
        ) : abaAtiva === 'usuarios' ? (
          <section className="panel">
            <UserManagement
              usuarios={usuarios}
              usuarioAtual={usuarioLogado}
              solicitacoes={solicitacoes}
              onCreate={handleCriarUsuario}
              onUpdate={handleAtualizarUsuario}
              onDelete={handleExcluirUsuario}
              onAprovarSolicitacao={handleAprovarSolicitacao}
              onRecusarSolicitacao={handleRecusarSolicitacao}
            />
          </section>
        ) : (
          <section className="panel">
            <SettingsPage
              produtos={produtos}
              onCriarProduto={handleCriarProduto}
              onAtualizarProduto={handleAtualizarProduto}
              onRemoverProduto={handleRemoverProduto}
            />
          </section>
        )}
      </main>

      <TimeModal
        aberto={modalTempo.aberto}
        valorAtual={modalTempo.aberto ? modalTempo.tarefa.tempoTrabalhadoHoras : undefined}
        sugestaoHoras={modalTempo.aberto ? modalTempo.sugestaoTempoHoras : undefined}
        onCancelar={handleCancelarTempo}
        onConfirmar={handleConfirmarTempo}
      />

      <TaskModal
        aberto={modalTarefa.aberto}
        tarefa={modalTarefa.aberto ? modalTarefa.tarefa : null}
        dataPadrao={filtros.data || calendarioRef}
        usuarios={usuarios}
        usuarioAtualId={usuarioLogado?.id}
        produtos={produtosAtivos}
        todasTarefas={tarefasVisiveis}
        tarefaMaeParaFormulario={
          modalTarefa.aberto && modalTarefa.tarefa?.parentId
            ? tarefas.find((t) => t.id === modalTarefa.tarefa!.parentId) ?? null
            : null
        }
        onClose={() => setModalTarefa({ aberto: false })}
        onSubmit={handleSalvarTarefa}
        onCriarSubtarefa={handleCriarSubtarefa}
        onEditarSubtarefa={(sub) => setModalTarefa({ aberto: true, tarefa: sub })}
        onExcluirSubtarefa={handleExcluir}
        onAlterarStatusSubtarefa={handleAlterarStatus}
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
