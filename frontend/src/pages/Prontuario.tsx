import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Save, Syringe, Microscope, Plus, Trash2, Pill, Check, Printer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface Consulta {
  id: string;
  pet_id: string;
  tutor_id: string; // Adicionado
  data_hora: string;
  tipo: string;
  motivo: string;
  observacoes: string | null;
  status: string;
  pets: { nome: string; especie: string; raca: string } | null;
  tutores: { id: string, nome: string, telefone?: string } | null; // Adicionado id e telefone
}

interface Prontuario {
  id: string;
  consulta_id: string;
  pet_id: string;
  peso: string;
  temperatura: string;
  frequencia_cardiaca: string;
  frequencia_respiratoria: string;
  queixa_principal: string;
  anamnese: string;
  exame_fisico: string;
  hipotese_diagnostica: string;
  diagnostico: string;
  tratamento: string;
  orientacoes: string;
  retorno_em: string;
}

interface Vacina {
  id: string;
  nome: string;
  fabricante: string | null;
  lote: string | null;
  data_aplicacao: string;
  data_reforco: string | null;
  observacoes: string | null;
}

interface Exame {
  id: string;
  tipo: string;
  descricao: string | null;
  laboratorio: string | null;
  data_solicitacao: string;
  data_resultado: string | null;
  resultado: string | null;
}

interface Prescricao {
  id: string;
  medicamentos: {
    nome: string;
    dose: string;
    frequencia: string;
    duracao: string;
    via: string;
    preco: number;
    venderNaClinica: boolean;
    quantidade: number;
    valor_total: number;
  }[];
  observacoes: string | null;
  criado_em: string;
}

const especieLabels: Record<string, string> = {
  cao: 'Cão/Cachorro',
  gato: 'Gato',
  passaro: 'Pássaro',
  roedor: 'Roedor',
  reptil: 'Réptil',
  outro: 'Outro',
};

export default function ProntuarioPage() {
  const { consultaId } = useParams<{ consultaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData, loading: authLoading } = useAuth();
  const canEdit = userData?.cargo === 'admin' || userData?.cargo === 'veterinario';

  // Debug de permissões
  useEffect(() => {
    if (!authLoading) {
      console.log('--- Debug Permissões Prontuário ---');
      console.log('UserData:', userData);
      console.log('Cargo:', userData?.cargo);
      console.log('canEdit:', canEdit);
      console.log('-----------------------------------');
    }
  }, [userData, authLoading, canEdit]);

  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [form, setForm] = useState({ 
    peso: '', 
    temperatura: '', 
    frequencia_cardiaca: '',
    frequencia_respiratoria: '',
    queixa_principal: '',
    anamnese: '',
    exame_fisico: '',
    hipotese_diagnostica: '',
    diagnostico: '', 
    tratamento: '', 
    orientacoes: '',
    retorno_em: ''
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Estados para Vacinas
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [nomeVacina, setNomeVacina] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [lote, setLote] = useState('');
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().split('T')[0]);
  const [dataReforco, setDataReforco] = useState('');
  const [observacoesVacina, setObservacoesVacina] = useState('');
  const [addingVacina, setAddingVacina] = useState(false);

  // Estados para Exames
  const [exames, setExames] = useState<Exame[]>([]);
  const [tipoExame, setTipoExame] = useState('');
  const [descricaoExame, setDescricaoExame] = useState('');
  const [laboratorio, setLaboratorio] = useState('');
  const [dataSolicitacao, setDataSolicitacao] = useState(new Date().toISOString().split('T')[0]);
  const [dataResultadoExame, setDataResultadoExame] = useState('');
  const [resultadoExame, setResultadoExame] = useState('');
  const [addingExame, setAddingExame] = useState(false);

  // Estados para Prescrições
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [nomeMed, setNomeMed] = useState('');
  const [dose, setDose] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [duracao, setDuracao] = useState('');
  const [via, setVia] = useState('oral');
  const [observacoesPrescricao, setObservacoesPrescricao] = useState('');
  const [addingPrescricao, setAddingPrescricao] = useState(false);

  // Estados para Cobrança
  const [allServicos, setAllServicos] = useState<any[]>([]);

  // Novos estados para integração com estoque e catálogo
  const [vacinasEstoque, setVacinasEstoque] = useState<any[]>([]);
  const [medicamentosEstoque, setMedicamentosEstoque] = useState<any[]>([]);
  const [vacinaSelecionadaId, setVacinaSelecionadaId] = useState<string>('');
  const [venderNaClinica, setVenderNaClinica] = useState(true);
  const [buscaExame, setBuscaExame] = useState('');
  const [examesServicos, setExamesServicos] = useState<any[]>([]);
  const [examesFiltrados, setExamesFiltrados] = useState<any[]>([]);
  const [precoExame, setPrecoExame] = useState<number>(0);
  const [precoEncontrado, setPrecoEncontrado] = useState(false);
  const [salvarNoCatalogo, setSalvarNoCatalogo] = useState(false);
  const [buscaMed, setBuscaMed] = useState('');
  const [medicamentoSelecionadoId, setMedicamentoSelecionadoId] = useState<string>('');
  const [precoMedicamento, setPrecoMedicamento] = useState<number>(0);
  const [vacinasReceita, setVacinasReceita] = useState<any[]>([]);
  const [examesReceita, setExamesReceita] = useState<any[]>([]);

  useEffect(() => {
    if (!consultaId) return;

    const fetchVacinas = async (petId: string) => {
      const { data } = await supabase.from('vacinas').select('*').eq('pet_id', petId).order('data_aplicacao', { ascending: false });
      if (data) setVacinas(data as Vacina[]);
    };

    const fetchExames = async (pId: string) => {
      const { data } = await supabase.from('exames').select('*').eq('prontuario_id', pId).order('data_solicitacao', { ascending: false });
      if (data) setExames(data as Exame[]);
    };

    const fetchPrescricoes = async (pId: string) => {
      const { data, error } = await supabase.from('prescricoes').select('*').eq('prontuario_id', pId).order('criado_em', { ascending: false });
      if (error) console.error('Erro ao buscar prescrições:', error);
      if (data) setPrescricoes(data as Prescricao[]);
    };

    const fetchData = async () => {
      const [consultaRes, prontuarioRes, estoqueRes, servicosRes] = await Promise.all([
        supabase
          .from('consultas')
          .select(`
            id, pet_id, tutor_id, data_hora, tipo, status, motivo, observacoes,
            pets ( nome, especie, raca ),
            tutores ( id, nome, telefone )
          `)
          .eq('id', consultaId)
          .single(),
        supabase.from('prontuarios').select('*').eq('consulta_id', consultaId).maybeSingle(),
        supabase
          .from('estoque_produtos')
          .select('id, nome, marca, preco_venda, estoque_atual, categoria_id, estoque_categorias(nome)')
          .eq('ativo', true),
        supabase
          .from('servicos')
          .select('*')
          .eq('ativo', true)
      ]);

      if (consultaRes.data) {
        const c = consultaRes.data as unknown as Consulta;
        setConsulta(c);
        fetchVacinas(c.pet_id);
      }
      
      if (prontuarioRes.data) {
        const p = prontuarioRes.data as unknown as Prontuario;
        setExistingId(p.id);
        fetchExames(p.id);
        fetchPrescricoes(p.id);
        setForm({
          peso: p.peso ?? '',
          temperatura: p.temperatura ?? '',
          frequencia_cardiaca: p.frequencia_cardiaca ?? '',
          frequencia_respiratoria: p.frequencia_respiratoria ?? '',
          queixa_principal: p.queixa_principal ?? '',
          anamnese: p.anamnese ?? '',
          exame_fisico: p.exame_fisico ?? '',
          hipotese_diagnostica: p.hipotese_diagnostica ?? '',
          diagnostico: p.diagnostico ?? '',
          tratamento: p.tratamento ?? '',
          orientacoes: p.orientacoes ?? '',
        });

        // Buscar vacinas aplicadas nesta consulta (mesma data do atendimento)
        const dataAtendimento = p.data_atendimento ? p.data_atendimento.split('T')[0] : new Date().toISOString().split('T')[0];
        const { data: vReceita } = await supabase
          .from('vacinas')
          .select('*')
          .eq('pet_id', p.pet_id)
          .eq('data_atendimento', dataAtendimento);
        if (vReceita) setVacinasReceita(vReceita);

        // Buscar exames deste prontuário
        const { data: eReceita } = await supabase
          .from('exames')
          .select('*')
          .eq('prontuario_id', p.id);
        if (eReceita) setExamesReceita(eReceita);
      }

      if (estoqueRes.data) {
        const todosProdutos = estoqueRes.data as any[];
        // Filtrar Vacinas
        setVacinasEstoque(todosProdutos.filter(p => p.estoque_categorias?.nome === 'Vacinas'));
        // Filtrar Medicamentos (remover categorias que não são remédios/materiais clínicos se necessário)
        setMedicamentosEstoque(todosProdutos.filter(p => 
          !['Vacinas', 'Rações', 'Acessórios', 'Higiene e Banho'].includes(p.estoque_categorias?.nome)
        ));
      }

      if (servicosRes.data) {
        setAllServicos(servicosRes.data);
      }
    };

    fetchData();
  }, [consultaId]);

  // Buscar exames do catálogo no início
  useEffect(() => {
    const buscarExamesServicos = async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, preco')
        .eq('categoria', 'exame')
        .eq('ativo', true)
        .order('nome');
      
      console.log('Exames do catálogo:', data, error);
      setExamesServicos(data || []);
    };
    buscarExamesServicos();
  }, []);

  // Filtrar ao digitar exame
  useEffect(() => {
    if (buscaExame.length >= 2) {
      const filtrados = examesServicos.filter(e =>
        e.nome.toLowerCase().includes(buscaExame.toLowerCase())
      );
      setExamesFiltrados(filtrados);
    } else {
      setExamesFiltrados([]);
    }
  }, [buscaExame, examesServicos]);

  const calcularQuantidade = (frequencia: string, duracao: string): number => {
    // Extrair número de doses por dia
    const dosesMap: Record<string, number> = {
      'dose única': 1,
      'a cada 24h': 1,
      'a cada 12h': 2,
      'a cada 8h': 3,
      'a cada 6h': 4,
      'a cada 4h': 6,
      'a cada 72h': 0.33,
      'a cada 48h': 0.5,
      '1x ao dia': 1,
      '2x ao dia': 2,
      '3x ao dia': 3,
      '8h': 3,
      '12h': 2,
      '24h': 1,
    };

    // Extrair número de dias
    const diasMatch = duracao.toLowerCase().match(/(\d+)\s*dia/);
    const dosesMatch = duracao.toLowerCase().match(/(\d+)\s*dose/);
    
    const dias = diasMatch ? parseInt(diasMatch[1]) : 1;
    const doses = dosesMatch ? parseInt(dosesMatch[1]) : null;
    
    if (doses) return doses; // se duração for em doses
    
    const dosesPorDia = dosesMap[frequencia.toLowerCase()] || 1;
    return Math.ceil(dias * dosesPorDia);
  };

  if (authLoading || !userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !consulta) {
      toast({ title: 'Erro', description: 'Usuário ou consulta não encontrada', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const payload = {
      pet_id: consulta.pet_id,
      consulta_id: consultaId,
      veterinario_id: user.id,
      data_atendimento: new Date().toISOString(),
      peso: parseFloat(form.peso) || null,
      temperatura: parseFloat(form.temperatura) || null,
      frequencia_cardiaca: parseInt(form.frequencia_cardiaca) || null,
      frequencia_respiratoria: parseInt(form.frequencia_respiratoria) || null,
      queixa_principal: form.queixa_principal,
      anamnese: form.anamnese,
      exame_fisico: form.exame_fisico,
      hipotese_diagnostica: form.hipotese_diagnostica,
      diagnostico: form.diagnostico,
      tratamento: form.tratamento,
      orientacoes: form.orientacoes,
      retorno_em: form.retorno_em || null,
    };

    const { data: prontuarioData, error } = existingId
      ? await supabase.from('prontuarios').update(payload).eq('id', existingId).select().single()
      : await supabase.from('prontuarios').insert([payload]).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      if (prontuarioData) setExistingId(prontuarioData.id);
      toast({ title: existingId ? 'Prontuário atualizado!' : 'Prontuário salvo!' });
      // Removemos o redirecionamento automático
    }
    setLoading(false);
  };

  const handleFinalizarAtendimento = async () => {
    if (!consultaId || !consulta) return;
    setIsFinalizing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const buscarPrecoConsulta = (tipo: string) => {
        const mapeamento: Record<string, string> = {
          'consulta': 'Consulta Clínica Geral',
          'retorno': 'Consulta de Retorno',
          'emergencia': 'Consulta de Emergência',
          'cirurgia': 'Castração',
          'vacina': 'Vacina V8 / V10',
          'exame': 'Hemograma Completo',
          'banho_tosa': 'Banho e Tosa (Pequeno Porte)'
        };
        
        const nomeServico = mapeamento[tipo] || 'Consulta Clínica Geral';
        const servico = allServicos?.find(s => s.nome === nomeServico);
        return {
          preco: servico?.preco || 120.00,
          nome: nomeServico
        };
      };

      const itens: any[] = [];

      // 1. Consulta (obrigatório)
      const infoConsulta = buscarPrecoConsulta(consulta.tipo);
      itens.push({
        descricao: infoConsulta.nome,
        quantidade: 1,
        valor_unitario: infoConsulta.preco,
        obrigatorio: true,
        tipo: 'consulta'
      });

      // 2. Vacinas aplicadas (obrigatório)
      // Usar as vacinas que já estão no estado local (carregadas no useEffect ou adicionadas agora)
      // Filtrar apenas as do dia de hoje para o atendimento atual
      const hojeStr = new Date().toISOString().split('T')[0];
      const vacinasAtendimento = vacinas.filter(v => v.data_aplicacao === hojeStr);

      vacinasAtendimento?.forEach(v => {
        const prod = vacinasEstoque.find(ve => ve.nome.toLowerCase() === v.nome.toLowerCase());
        itens.push({
          descricao: `Vacina - ${v.nome}`,
          quantidade: 1,
          valor_unitario: prod?.preco_venda || 0,
          obrigatorio: true,
          tipo: 'vacina'
        });
      });

      // 3. Exames solicitados (opcional)
      exames.forEach(e => {
        const servico = allServicos.find(s => s.categoria === 'exame' && s.nome.toLowerCase() === e.tipo.toLowerCase());
        itens.push({
          descricao: `Exame - ${e.tipo}`,
          quantidade: 1,
          valor_unitario: servico?.preco || 0,
          obrigatorio: false,
          tipo: 'exame'
        });
      });

      // 4. Medicamentos prescritos (opcional)
      prescricoes.forEach(p => {
        const meds = Array.isArray(p.medicamentos) ? p.medicamentos : [p.medicamentos];
        meds?.forEach((med: any) => {
          if (med.venderNaClinica && med.preco > 0) {
            itens.push({
              descricao: `${med.nome} (${med.quantidade}un)`,
              quantidade: med.quantidade || 1,
              valor_unitario: med.preco,
              valor_total: med.valor_total || (med.quantidade * med.preco),
              obrigatorio: false,
              tipo: 'medicamento'
            });
          }
        });
      });

      const valorTotal = itens.reduce((acc, i) => acc + (i.valor_unitario * i.quantidade), 0);

      // Criar pré-cobrança no financeiro com status "rascunho"
      const { data: financeiro, error: finError } = await supabase
        .from('financeiro')
        .insert({
          consulta_id: consultaId,
          tutor_id: consulta.tutor_id || consulta.tutores?.id,
          descricao: `Atendimento - ${consulta.pets?.nome}`,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status: 'rascunho',
          criado_por: user.id,
          data_vencimento: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (finError) throw finError;

      if (financeiro && itens.length > 0) {
        const { error: itemsError } = await supabase
          .from('financeiro_itens')
          .insert(
            itens.map(item => ({
              financeiro_id: financeiro.id,
              descricao: item.descricao,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              obrigatorio: item.obrigatorio
            }))
          );
        if (itemsError) throw itemsError;
      }

      // Atualizar status da consulta para concluido
      await supabase
        .from('consultas')
        .update({ status: 'concluido' })
        .eq('id', consultaId);

      toast({ title: 'Atendimento finalizado!', description: 'Cobrança enviada para o financeiro como rascunho.' });
      navigate('/prontuarios');
    } catch (err: any) {
      toast({ title: 'Erro ao finalizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleAddMedicamento = async () => {
    if (!nomeMed || !consulta || !existingId) {
      toast({ title: 'Atenção', description: 'Informe o nome do medicamento.', variant: 'destructive' });
      return;
    }

    setAddingPrescricao(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const medicamentoSelecionado = medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId);
    
    const quantidadeCalculada = calcularQuantidade(frequencia, duracao);
    
    // 1. Montar objeto do medicamento
    const novoMedicamento = {
      nome: nomeMed,
      dose,
      frequencia,
      duracao,
      via,
      preco: precoMedicamento || medicamentoSelecionado?.preco_venda || 0,
      venderNaClinica,
      quantidade: quantidadeCalculada,
      valor_total: quantidadeCalculada * (precoMedicamento || medicamentoSelecionado?.preco_venda || 0)
    };

    // 2. Salvar no banco
    const { data, error } = await supabase.from('prescricoes').insert({
      pet_id: consulta.pet_id,
      prontuario_id: existingId,
      veterinario_id: user?.id,
      medicamentos: [novoMedicamento],
      observacoes: observacoesPrescricao || null,
      data_emissao: new Date().toISOString().split('T')[0]
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      // 3. Atualizar estado local imediatamente
      setPrescricoes(prev => [data as Prescricao, ...prev]);

      // 4. Baixar do estoque se "Vender na clínica" estiver marcado
      if (venderNaClinica && medicamentoSelecionado) {
        const quantidade = calcularQuantidade(frequencia, duracao); 
        const novaQtde = medicamentoSelecionado.estoque_atual - quantidade;

        await supabase
          .from('estoque_produtos')
          .update({ 
            estoque_atual: novaQtde,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', medicamentoSelecionado.id);

        await supabase
          .from('estoque_movimentacoes')
          .insert({
            produto_id: medicamentoSelecionado.id,
            tipo: 'venda',
            quantidade: quantidade,
            quantidade_anterior: medicamentoSelecionado.estoque_atual,
            quantidade_atual: novaQtde,
            motivo: `Venda - ${consulta.pets?.nome}`,
            consulta_id: consulta.id,
            registrado_por: user?.id
          });
          
        setMedicamentosEstoque(prev => prev.map(m => m.id === medicamentoSelecionado.id ? { ...m, estoque_atual: novaQtde } : m));
      }

      // 5. Limpar formulário
      setNomeMed('');
      setDose('');
      setFrequencia('');
      setDuracao('');
      setVia('oral');
      setPrecoMedicamento(0);
      setVenderNaClinica(true);
      setObservacoesPrescricao('');
      setMedicamentoSelecionadoId('');
      setBuscaMed('');
      toast({ title: 'Sucesso', description: 'Medicamento adicionado!' });
    }
    setAddingPrescricao(false);
  };

  const handleAddVacina = async () => {
    if (!nomeVacina || !consulta) {
      toast({ title: 'Atenção', description: 'O nome da vacina é obrigatório', variant: 'destructive' });
      return;
    }

    setAddingVacina(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const vacinaSelecionada = vacinasEstoque.find(v => v.id === vacinaSelecionadaId);

    const { data, error } = await supabase.from('vacinas').insert({
      pet_id: consulta.pet_id,
      veterinario_id: user?.id,
      nome: nomeVacina,
      fabricante: fabricante || null,
      lote: lote || null,
      data_aplicacao: dataAplicacao,
      data_reforco: dataReforco || null,
      observacoes: observacoesVacina || null
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      // Baixar 1 unidade do estoque se selecionado
      if (vacinaSelecionada) {
        const novaQtde = vacinaSelecionada.estoque_atual - 1;
        
        await supabase
          .from('estoque_produtos')
          .update({ 
            estoque_atual: novaQtde,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', vacinaSelecionada.id);

        // Registrar movimentação
        await supabase
          .from('estoque_movimentacoes')
          .insert({
            produto_id: vacinaSelecionada.id,
            tipo: 'venda',
            quantidade: 1,
            quantidade_anterior: vacinaSelecionada.estoque_atual,
            quantidade_atual: novaQtde,
            motivo: `Vacina aplicada - ${consulta.pets?.nome}`,
            consulta_id: consulta.id,
            registrado_por: user?.id
          });
          
        // Atualizar lista local do estoque para refletir a baixa se necessário (opcional pois o fetch inicial já passou)
        setVacinasEstoque(prev => prev.map(v => v.id === vacinaSelecionada.id ? { ...v, estoque_atual: novaQtde } : v));
      }

      setVacinas([data as Vacina, ...vacinas]);
      setNomeVacina('');
      setFabricante('');
      setLote('');
      setDataAplicacao(new Date().toISOString().split('T')[0]);
      setDataReforco('');
      setObservacoesVacina('');
      setVacinaSelecionadaId('');
      toast({ title: 'Sucesso', description: 'Vacina adicionada com sucesso!' });
    }
    setAddingVacina(false);
  };

  const handleAddExame = async () => {
    if (!tipoExame || !consulta || !existingId) {
      toast({ title: 'Atenção', description: !existingId ? 'Salve o prontuário primeiro para adicionar exames.' : 'Informe o tipo do exame.', variant: !existingId ? 'default' : 'destructive' });
      return;
    }

    setAddingExame(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Salvar no catálogo se solicitado e não encontrado
    if (salvarNoCatalogo && !precoEncontrado && precoExame > 0) {
      const { data: newServico, error: servicoError } = await supabase
        .from('servicos')
        .insert({
          nome: tipoExame,
          categoria: 'exame',
          preco: precoExame,
          ativo: true
        })
        .select()
        .single();
      
      if (!servicoError && newServico) {
        setExamesServicos([...examesServicos, newServico]);
      }
    }

    const { data, error } = await supabase.from('exames').insert({
      pet_id: consulta.pet_id,
      prontuario_id: existingId,
      veterinario_id: user?.id,
      tipo: tipoExame,
      descricao: descricaoExame || null,
      laboratorio: laboratorio || null,
      data_solicitacao: dataSolicitacao,
      data_resultado: dataResultadoExame || null,
      resultado: resultadoExame || null
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setExames([data as Exame, ...exames]);
      setTipoExame('');
      setBuscaExame('');
      setLaboratorio('');
      setDataSolicitacao(new Date().toISOString().split('T')[0]);
      setDataResultadoExame('');
      setResultadoExame('');
      setDescricaoExame('');
      setSalvarNoCatalogo(false);
      setPrecoExame(0);
      setPrecoEncontrado(false);
      toast({ title: 'Sucesso', description: 'Exame adicionado com sucesso!' });
    }
    setAddingExame(false);
  };

  const handleImprimirReceita = async () => {
    if (!existingId || !consulta) {
      toast({ title: 'Atenção', description: 'Salve o prontuário primeiro para imprimir a receita.', variant: 'destructive' });
      return;
    }

    try {
      // 1. Buscar prontuário completo com veterinário
      const { data: prontuario, error: pError } = await supabase
        .from('prontuarios')
        .select(`
          *,
          usuarios:veterinario_id ( nome, crmv )
        `)
        .eq('id', existingId)
        .single();
      
      if (pError || !prontuario) throw new Error('Erro ao carregar dados do prontuário.');

      // 2. Buscar vacinas aplicadas nesta data
      const dataAtendimento = prontuario.data_atendimento.split('T')[0];
      const { data: vacinasReceita } = await supabase
        .from('vacinas')
        .select('*')
        .eq('pet_id', prontuario.pet_id)
        .eq('data_aplicacao', dataAtendimento);

      // 3. Buscar exames deste prontuário
      const { data: examesReceita } = await supabase
        .from('exames')
        .select('*')
        .eq('prontuario_id', prontuario.id);

      // 4. Buscar medicamentos das prescrições
      const { data: prescricoesReceita } = await supabase
        .from('prescricoes')
        .select('*')
        .eq('prontuario_id', prontuario.id)
        .order('criado_em', { ascending: false });

      // Montar HTML da receita
      const conteudo = `
        <html>
        <head>
          <title>Receita - ${consulta.pets?.nome}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              font-size: 13px; 
              line-height: 1.6;
              margin: 0;
              padding: 2cm;
              color: #333;
            }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            
            .date-box { text-align: right; margin-bottom: 30px; color: #666; }
            
            section { margin-bottom: 25px; }
            h2 { 
              font-size: 14px; 
              color: #1e40af; 
              text-transform: uppercase; 
              letter-spacing: 1px;
              border-bottom: 1px solid #e5e7eb; 
              padding-bottom: 5px; 
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            
            .card { background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 10px; border: 1px solid #f1f5f9; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 2px; }
            .info-value { font-weight: 600; color: #1e293b; font-size: 14px; }
            
            .item-prescricao { margin-bottom: 20px; border-left: 4px solid #10b981; padding-left: 15px; }
            .item-nome { font-weight: bold; font-size: 15px; color: #064e3b; margin-bottom: 2px; }
            .item-uso { font-style: italic; color: #374151; }
            .item-obs { font-size: 12px; color: #6b7280; margin-top: 5px; background: #ecfdf5; padding: 5px 10px; border-radius: 4px; }
            
            .item-vacina, .item-exame { padding: 12px; background: #f1f5f9; border-radius: 6px; margin-bottom: 10px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; margin-top: 5px; }
            .badge-primary { background: #dbeafe; color: #1e40af; }
            .badge-success { background: #dcfce7; color: #166534; }
            
            .orientacoes { background: #fffbe3; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; font-style: italic; white-space: pre-wrap; }
            
            .assinatura-area { margin-top: 80px; text-align: center; }
            .linha { width: 250px; border-top: 1px solid #333; margin: 0 auto 10px; }
            .vet-nome { font-weight: bold; font-size: 14px; color: #1e293b; }
            .vet-crmv { font-size: 11px; color: #64748b; text-transform: uppercase; }
            
            @media print {
              body { padding: 2cm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PetFlow</h1>
            <p>Clínica Veterinária</p>
          </div>

          <div class="date-box">
            ${new Date(prontuario.data_atendimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </div>

          <section>
            <h2>Paciente e Tutor</h2>
            <div class="card grid">
              <div>
                <div class="info-label">Paciente</div>
                <div class="info-value">${consulta.pets?.nome}</div>
                <div style="font-size: 12px; color: #666;">${especieLabels[consulta.pets?.especie || ''] || consulta.pets?.especie} ${consulta.pets?.raca ? ` • ${consulta.pets.raca}` : ''}</div>
              </div>
              <div>
                <div class="info-label">Tutor</div>
                <div class="info-value">${consulta.tutores?.nome}</div>
                <div style="font-size: 12px; color: #666;">${consulta.tutores?.telefone || '—'}</div>
              </div>
            </div>
          </section>

          ${prescricoesReceita?.length > 0 ? `
          <section>
            <h2>Fórmulas e Medicamentos</h2>
            <div style="margin-top: 15px;">
              ${prescricoesReceita.map(p => 
                p.medicamentos?.map((med: any) => `
                  <div class="item-prescricao">
                    <div class="item-nome">${med.nome} — ${med.dose}</div>
                    <div class="item-uso">Uso ${med.via}: ${med.frequencia} por ${med.duracao}</div>
                    ${p.observacoes ? `<div class="item-obs">Obs: ${p.observacoes}</div>` : ''}
                  </div>
                `).join('')
              ).join('')}
            </div>
          </section>
          ` : `
          <section>
            <h2>Fórmulas e Medicamentos</h2>
            <p style="color: #94a3b8; font-style: italic;">Nenhum medicamento prescrito.</p>
          </section>
          `}

          ${vacinasReceita?.length > 0 ? `
          <section>
            <h2>Vacinação Aplicada</h2>
            ${vacinasReceita.map(v => `
              <div class="item-vacina">
                <div style="font-weight: bold; font-size: 13px;">${v.nome}</div>
                <div style="font-size: 11px; color: #64748b;">${v.fabricante || 'Fabricante não informado'} | Lote: ${v.lote || 'N/I'}</div>
                <div style="margin-top: 5px; font-size: 11px;">
                  <span class="badge badge-success">Aplicada: ${new Date(v.data_aplicacao).toLocaleDateString('pt-BR')}</span>
                  ${v.data_reforco ? `<span class="badge badge-primary">Reforço: ${new Date(v.data_reforco).toLocaleDateString('pt-BR')}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </section>
          ` : ''}

          ${examesReceita?.length > 0 ? `
          <section>
            <h2>Exames Solicitados</h2>
            ${examesReceita.map(e => `
              <div class="item-exame">
                <div style="font-weight: bold;">${e.tipo}</div>
                <div style="font-size: 11px; color: #64748b;">${e.laboratorio || 'Laboratório a definir'} • Solicitado em: ${new Date(e.data_solicitacao).toLocaleDateString('pt-BR')}</div>
                <div class="badge ${e.resultado ? 'badge-success' : 'badge-primary'}">
                  Status: ${e.resultado ? 'Resultado disponível' : 'Aguardando resultado'}
                </div>
              </div>
            `).join('')}
          </section>
          ` : ''}

          ${prontuario.orientacoes ? `
          <section>
            <h2>Orientações Complementares</h2>
            <div class="orientacoes">${prontuario.orientacoes}</div>
          </section>
          ` : ''}

          ${prontuario.retorno_em ? `
          <section style="text-align: center; margin: 40px 0;">
             <div style="display:inline-block; border: 2px dashed #cbd5e1; padding: 10px 30px; border-radius: 10px;">
               <div class="info-label" style="text-align: center;">Sugestão de Retorno</div>
               <div class="info-value" style="font-size: 18px; color: #2563eb;">${new Date(prontuario.retorno_em).toLocaleDateString('pt-BR')}</div>
             </div>
          </section>
          ` : ''}

          <div class="assinatura-area">
            <div class="linha"></div>
            <div class="vet-nome">Dr(a). ${prontuario.usuarios?.nome}</div>
            <div class="vet-crmv">Médico(a) Veterinário(a) ${prontuario.usuarios?.crmv ? `• CRMV: ${prontuario.usuarios.crmv}` : ''}</div>
          </div>
        </body>
        </html>
      `;

      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(conteudo);
        janela.document.close();
        
        janela.addEventListener('load', () => {
          janela.print();
          janela.close();
        });

        // Fallback se o evento load não disparar
        setTimeout(() => {
          janela.print();
        }, 800);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao preparar impressão', description: err.message, variant: 'destructive' });
    }
  };

  if (!consulta) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando consulta...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agenda')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prontuário</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="ml-auto flex gap-2 no-print">
          {existingId && (
            <Button variant="outline" onClick={handleImprimirReceita} className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Receita
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informações da Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pet</p>
              <p className="font-medium text-foreground">{consulta.pets?.nome ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Espécie / Raça</p>
              <p className="font-medium text-foreground">
                {consulta.pets?.especie ? (especieLabels[consulta.pets.especie] || consulta.pets.especie) : '—'} 
                {consulta.pets?.raca ? ` / ${consulta.pets.raca}` : ''}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tutor</p>
              <p className="font-medium text-foreground">{consulta.tutores?.nome ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium text-foreground">{consulta.tipo}</p>
            </div>
          </div>
          {consulta.motivo && (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Motivo</p>
              <p className="font-medium text-foreground">{consulta.motivo}</p>
            </div>
          )}

          {consulta.observacoes && (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Observações do Agendamento</p>
              <p className="font-medium text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-100 italic">
                {consulta.observacoes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="clinico" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/20">
          <TabsTrigger value="clinico" className="gap-2">
            <FileText className="h-4 w-4" /> Registro Clínico
          </TabsTrigger>
          <TabsTrigger value="prescricoes" disabled={!existingId} className="gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
            <Pill className="h-4 w-4" /> Prescrições
          </TabsTrigger>
          <TabsTrigger value="exames" disabled={!existingId} className="gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
            <Microscope className="h-4 w-4" /> Exames
          </TabsTrigger>
          <TabsTrigger value="vacinas" disabled={!existingId} className="gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
            <Syringe className="h-4 w-4" /> Vacinas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinico">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Registro Clínico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Peso (kg)</Label>
                    <Input type="text" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} placeholder="Ex: 5.2" disabled={!canEdit} />
                  </div>
                  <div className="space-y-1">
                    <Label>Temperatura (°C)</Label>
                    <Input type="text" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} placeholder="Ex: 38.5" disabled={!canEdit} />
                  </div>
                  <div className="space-y-1">
                    <Label>FC (bpm)</Label>
                    <Input type="text" value={form.frequencia_cardiaca} onChange={(e) => setForm({ ...form, frequencia_cardiaca: e.target.value })} placeholder="Ex: 80" disabled={!canEdit} />
                  </div>
                  <div className="space-y-1">
                    <Label>FR (mpm)</Label>
                    <Input type="text" value={form.frequencia_respiratoria} onChange={(e) => setForm({ ...form, frequencia_respiratoria: e.target.value })} placeholder="Ex: 20" disabled={!canEdit} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Queixa Principal</Label>
                  <Input value={form.queixa_principal} onChange={(e) => setForm({ ...form, queixa_principal: e.target.value })} placeholder="Ex: Coceira excessiva nas orelhas" disabled={!canEdit} />
                </div>

                <div className="space-y-1">
                  <Label>Anamnese</Label>
                  <Textarea value={form.anamnese} onChange={(e) => setForm({ ...form, anamnese: e.target.value })} placeholder="Histórico do paciente, início dos sintomas..." rows={4} disabled={!canEdit} />
                </div>

                <div className="space-y-1">
                  <Label>Exame Físico</Label>
                  <Textarea value={form.exame_fisico} onChange={(e) => setForm({ ...form, exame_fisico: e.target.value })} placeholder="Observações do exame físico..." rows={4} disabled={!canEdit} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Hipótese Diagnóstica</Label>
                    <Input value={form.hipotese_diagnostica} onChange={(e) => setForm({ ...form, hipotese_diagnostica: e.target.value })} placeholder="Ex: Otite externa" disabled={!canEdit} />
                  </div>
                  <div className="space-y-1">
                    <Label>Diagnóstico Definitivo</Label>
                    <Input value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} placeholder="Ex: Otite fúngica por Malassezia" disabled={!canEdit} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Tratamento</Label>
                  <Textarea value={form.tratamento} onChange={(e) => setForm({ ...form, tratamento: e.target.value })} placeholder="Descreva o tratamento prescrito..." rows={3} disabled={!canEdit} />
                </div>

                <div className="space-y-1">
                  <Label>Orientações ao Tutor</Label>
                  <Textarea value={form.orientacoes} onChange={(e) => setForm({ ...form, orientacoes: e.target.value })} placeholder="Orientações de cuidado em casa..." rows={3} disabled={!canEdit} />
                </div>

                <div className="space-y-1">
                  <Label>Data de Retorno (Sugestão)</Label>
                  <Input type="date" value={form.retorno_em} onChange={(e) => setForm({ ...form, retorno_em: e.target.value })} disabled={!canEdit} />
                </div>
                
                {canEdit && (
                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      {existingId ? 'Atualizar Dados Clínicos' : 'Salvar Prontuário'}
                    </Button>
                    
                    {existingId && (
                      <Button type="button" onClick={handleFinalizarAtendimento} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isFinalizing}>
                        {isFinalizing ? 'Finalizando...' : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Finalizar Atendimento
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescricoes">
          <Card className="shadow-sm mt-4 border-green-100 italic">
            <CardHeader className="bg-green-50/50">
              <CardTitle className="text-lg text-green-800">
                Prescrições
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {canEdit && (
                  <>
                    <h3 className="font-medium">Adicionar Medicamento</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 col-span-2">
                        <Label>Buscar Medicamento no Estoque</Label>
                        <Input 
                          placeholder="Digite o nome para filtrar..." 
                          value={buscaMed} 
                          onChange={e => setBuscaMed(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Nome do Medicamento *</Label>
                        <div className="flex flex-col gap-2">
                          <Select 
                            value={medicamentoSelecionadoId} 
                            onValueChange={(id) => {
                              setMedicamentoSelecionadoId(id);
                              const med = medicamentosEstoque.find(m => m.id === id);
                              if (med) {
                                  setNomeMed(med.nome);
                                  setPrecoMedicamento(med.preco_venda);
                                  setVenderNaClinica(med.estoque_atual > 0);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione do estoque" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicamentosEstoque
                                .filter(m => m.nome.toLowerCase().includes(buscaMed.toLowerCase()))
                                .map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.nome} ({m.marca || '—'}) - {m.estoque_atual} un.
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Nome manual (se não houver no estoque)" 
                            value={nomeMed} 
                            onChange={e => setNomeMed(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Dose</Label>
                        <Input placeholder="Ex: 250mg" value={dose} onChange={e => setDose(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Frequência</Label>
                        <Input placeholder="Ex: 12h" value={frequencia} onChange={e => setFrequencia(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Duração</Label>
                        <Input placeholder="Ex: 7 dias" value={duracao} onChange={e => setDuracao(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Via</Label>
                        <Select value={via} onValueChange={setVia}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oral">Oral</SelectItem>
                            <SelectItem value="injetavel">Injetável</SelectItem>
                            <SelectItem value="topico">Tópico</SelectItem>
                            <SelectItem value="oftalmico">Oftálmico</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-center space-x-2 py-2 px-3 bg-blue-50/50 rounded-md border border-blue-100">
                        <Checkbox 
                          id="vender_clinica" 
                          checked={venderNaClinica} 
                          onCheckedChange={(v) => setVenderNaClinica(!!v)} 
                        />
                        <Label htmlFor="vender_clinica" className="text-sm font-medium leading-none cursor-pointer">
                          Vender na clínica (baixa automática do estoque)
                        </Label>
                        {medicamentoSelecionadoId && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Estoque: {medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId)?.estoque_atual} un.
                          </span>
                        )}
                      </div>

                      {frequencia && duracao && (
                        <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          <p className="text-sm text-green-700">
                            <strong>Quantidade necessária:</strong> {calcularQuantidade(frequencia, duracao)} unidades
                          </p>
                          {(precoMedicamento > 0 || (medicamentoSelecionadoId && medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId)?.preco_venda > 0)) && (
                            <p className="text-sm text-green-700">
                              <strong>Valor total:</strong> R$ {(calcularQuantidade(frequencia, duracao) * (precoMedicamento || medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId)?.preco_venda || 0)).toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}

                      {!medicamentoSelecionadoId && venderNaClinica && (
                        <div className="col-span-2 space-y-1 p-3 bg-green-50/30 rounded-md border border-green-100">
                          <Label className="text-xs text-green-800">💰 Valor Unitário para Cobrança</Label>
                          <div className="flex items-center gap-2">
                             <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="h-9" 
                                value={precoMedicamento || ''} 
                                onChange={e => setPrecoMedicamento(Number(e.target.value))} 
                             />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Observações da Prescrição</Label>
                      <Textarea 
                        placeholder="Ex: Diluir em água, administrar após as refeições..." 
                        value={observacoesPrescricao} 
                        onChange={e => setObservacoesPrescricao(e.target.value)} 
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleAddMedicamento} disabled={addingPrescricao} className="bg-green-600 hover:bg-green-700 w-full mt-2">
                       <Plus className="w-4 h-4 mr-2" /> Adicionar Medicamento
                    </Button>
                  </>
                )}
                
                {/* Lista de medicamentos registrados */}
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Medicamentos Registrados</h4>
                  {prescricoes.length > 0 ? (
                    <div className="grid gap-3">
                      {prescricoes.map((prescricao, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg border border-l-4 border-l-green-500 shadow-sm space-y-2">
                          {prescricao.medicamentos?.map((med: any, j: number) => (
                            <div key={j} className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <p className="font-bold text-green-900">{med.nome} — {med.dose}</p>
                                <p className="text-sm text-gray-600">
                                  {med.frequencia} por {med.duracao} — Via {med.via}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Quantidade: {med.quantidade} unidades × R$ {med.preco?.toFixed(2)}
                                </p>
                                {med.venderNaClinica && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 py-0 h-4">
                                      <Check className="w-2.5 h-2.5 mr-1" /> Venda na Clínica
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-green-600">
                                  R$ {(med.valor_total || (med.quantidade * med.preco) || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                      Nenhum medicamento registrado.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exames">
          <Card className="shadow-sm mt-4 border-blue-100">
            <CardHeader className="bg-blue-50/50">
              <CardTitle className="text-lg text-blue-800">
                Exames
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {canEdit && (
                  <>
                    <h3 className="font-medium">Adicionar Exame</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Tipo do Exame *</Label>
                        <div className="relative">
                          <Input
                            placeholder="Digite para buscar exame..."
                            value={buscaExame}
                            onChange={(e) => {
                              setBuscaExame(e.target.value)
                              setTipoExame(e.target.value)
                              setPrecoExame(0)
                              setPrecoEncontrado(false)
                            }}
                          />
                          
                          {/* Dropdown de sugestões */}
                          {buscaExame.length >= 2 && examesFiltrados.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {examesFiltrados.map((exame) => (
                                <div
                                  key={exame.id}
                                  className="px-4 py-2 hover:bg-green-50 cursor-pointer flex justify-between"
                                  onClick={() => {
                                    setTipoExame(exame.nome)
                                    setBuscaExame(exame.nome)
                                    setPrecoExame(exame.preco)
                                    setPrecoEncontrado(true)
                                  }}
                                >
                                  <span className="text-sm">{exame.nome}</span>
                                  <span className="text-green-600 font-medium text-sm">R$ {exame.preco}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Badge de preço encontrado */}
                        {precoEncontrado && (
                          <div className="flex items-center gap-2 text-green-600 mt-1">
                            <Check className="w-4 h-4" />
                            <span className="text-xs font-medium">Preço encontrado: R$ {precoExame?.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Campo de preço manual se não encontrou */}
                        {buscaExame.length >= 2 && !precoEncontrado && (
                          <div className="space-y-2 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <Label className="text-xs text-amber-800">💰 Preço do Exame</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="h-8"
                              value={precoExame || ''}
                              onChange={(e) => setPrecoExame(Number(e.target.value))}
                            />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="salvar_catalogo_exame"
                                checked={salvarNoCatalogo}
                                onCheckedChange={(v) => setSalvarNoCatalogo(v as boolean)}
                              />
                              <Label htmlFor="salvar_catalogo_exame" className="text-[10px] cursor-pointer">
                                Salvar no catálogo para próxima vez
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>Laboratório</Label>
                        <Input placeholder="Ex: LabVet" value={laboratorio} onChange={e => setLaboratorio(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data Solicitação</Label>
                        <Input type="date" value={dataSolicitacao} onChange={e => setDataSolicitacao(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data Resultado (se já tiver)</Label>
                        <Input type="date" value={dataResultadoExame} onChange={e => setDataResultadoExame(e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label>Descrição / Motivo do Exame</Label>
                        <Input placeholder="Ex: Avaliar função renal" value={descricaoExame} onChange={e => setDescricaoExame(e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label>Resultado (se disponível)</Label>
                        <Textarea placeholder="Descreva o resultado..." value={resultadoExame} onChange={e => setResultadoExame(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={handleAddExame} disabled={addingExame} className="bg-blue-600 hover:bg-blue-700 w-full">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Exame
                    </Button>
                  </>
                )}

                {/* Lista de exames adicionados */}
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground">Exames deste prontuário</h4>
                  {exames.length === 0 ? (
                    <p className="text-sm text-center py-4 text-muted-foreground bg-gray-50/50 rounded-lg">Nenhum exame solicitado.</p>
                  ) : (
                    <div className="grid gap-3">
                      {exames.map((e, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-l-4 border-l-blue-500 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-800">{e.tipo}</p>
                            <p className="text-sm text-gray-500">{e.laboratorio} • {format(new Date(e.data_solicitacao), 'dd/MM/yyyy')}</p>
                          </div>
                          <Badge variant={e.resultado ? 'default' : 'outline'}>{e.resultado ? 'Concluído' : 'Pendente'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacinas">
          <Card className="shadow-sm mt-4 border-green-100">
            <CardHeader className="bg-green-50/50">
              <CardTitle className="text-lg text-green-800">
                Vacinas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {canEdit && (
                  <>
                    <h3 className="font-medium">Adicionar Vacina</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Selecionar Vacina *</Label>
                        <Select 
                          value={vacinaSelecionadaId} 
                          onValueChange={(id) => {
                            setVacinaSelecionadaId(id);
                            const vacina = vacinasEstoque.find(v => v.id === id);
                            if (vacina) {
                                setNomeVacina(vacina.nome);
                                setFabricante(vacina.marca || '');
                            }
                          }}
                        >
                          <SelectTrigger className={vacinasEstoque.find(v => v.id === vacinaSelecionadaId)?.estoque_atual === 0 ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Escolha a vacina" />
                          </SelectTrigger>
                          <SelectContent>
                            {vacinasEstoque.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.nome} ({v.marca}) - {v.estoque_atual} un.
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {vacinaSelecionadaId && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Estoque: {vacinasEstoque.find(v => v.id === vacinaSelecionadaId)?.estoque_atual} unidades
                            </span>
                            {vacinasEstoque.find(v => v.id === vacinaSelecionadaId)?.estoque_atual === 0 && (
                              <Badge variant="destructive" className="text-[10px] py-0 h-4">Sem estoque</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>Fabricante</Label>
                        <Input placeholder="Ex: Zoetis" value={fabricante} onChange={e => setFabricante(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Lote</Label>
                        <Input placeholder="Ex: ABC123" value={lote} onChange={e => setLote(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data Aplicação *</Label>
                        <Input type="date" value={dataAplicacao} onChange={e => setDataAplicacao(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data Próximo Reforço</Label>
                        <Input type="date" value={dataReforco} onChange={e => setDataReforco(e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label>Observações</Label>
                        <Textarea placeholder="Ex: Reação leve na última aplicação..." value={observacoesVacina} onChange={e => setObservacoesVacina(e.target.value)} rows={2} />
                      </div>
                    </div>
                    <Button onClick={handleAddVacina} disabled={addingVacina} className="bg-green-600 hover:bg-green-700 w-full">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Vacina
                    </Button>
                  </>
                )}

                {/* Lista de vacinas adicionadas */}
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground">Histórico de Vacinas</h4>
                  {vacinas.length === 0 ? (
                    <p className="text-sm text-center py-4 text-muted-foreground bg-gray-50/50 rounded-lg">Nenhuma vacina registrada.</p>
                  ) : (
                    <div className="grid gap-3">
                      {vacinas.map((v, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-l-4 border-l-green-500 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-700">{v.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{v.fabricante} • Lote: {v.lote} • {format(new Date(v.data_aplicacao), 'dd/MM/yyyy')}</p>
                          </div>
                          {v.data_reforco && <Badge variant="secondary">Reforço: {format(new Date(v.data_reforco), 'dd/MM/yyyy')}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
