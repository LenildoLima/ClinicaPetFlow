import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Save, Syringe, Microscope, Plus, Trash2, Pill, Check } from 'lucide-react';
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
  tutores: { id: string, nome: string } | null; // Adicionado id
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
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingItems, setBillingItems] = useState<any[]>([]);
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
            tutores ( id, nome )
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
          retorno_em: p.retorno_em ?? '',
        });
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

  const handleFinalize = async () => {
    if (!consultaId || !consulta) return;
    setIsFinalizing(true);
    
    try {
      const buscarPreco = (nome: string, categoria: string) => {
        const servico = allServicos?.find(s => 
          s.nome.toLowerCase() === nome.toLowerCase() || 
          s.nome.toLowerCase().includes(nome.toLowerCase())
        );
        return servico?.preco || 0;
      };

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

      // 2. Montar itens da cobrança
      const itens: any[] = [];

      // Consulta
      const infoConsulta = buscarPrecoConsulta(consulta.tipo);
      itens.push({
        descricao: infoConsulta.nome,
        quantidade: 1,
        valor_unitario: infoConsulta.preco,
        pode_desmarcar: false,
        selecionado: true
      });

      // Exames
      exames.forEach(ex => {
        const servico = allServicos.find(s => s.categoria === 'exame' && s.nome.toLowerCase() === ex.tipo.toLowerCase());
        itens.push({
          descricao: `Exame - ${ex.tipo}`,
          quantidade: 1,
          valor_unitario: servico?.preco || 0,
          pode_desmarcar: true,
          selecionado: true
        });
      });

      // Vacinas
      vacinas.forEach(v => {
        const prod = vacinasEstoque.find(ve => ve.nome.toLowerCase() === v.nome.toLowerCase());
        itens.push({
          descricao: `Vacina - ${v.nome}`,
          quantidade: 1,
          valor_unitario: prod?.preco_venda || buscarPreco(v.nome, 'vacina'),
          pode_desmarcar: false,
          selecionado: true,
          tipo: 'vacina'
        });
      });

      // Medicamentos (Prescrições)
      prescricoes.forEach(p => {
        const meds = Array.isArray(p.medicamentos) 
          ? p.medicamentos 
          : [p.medicamentos];

        meds?.forEach((med: any) => {
          if (med.venderNaClinica === true && med.preco > 0) {
            itens.push({
              descricao: `${med.nome} - ${med.dose}`,
              quantidade: med.quantidade || 1,
              valor_unitario: med.preco,
              pode_desmarcar: true,
              selecionado: true,
              tipo: 'medicamento'
            });
          }
        });
      });

      setBillingItems(itens);
      setIsBillingModalOpen(true);
    } catch (err: any) {
      toast({ title: 'Erro ao preparar cobrança', description: err.message, variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const confirmarFinalizacao = async () => {
    if (!consultaId || !consulta) return;
    setIsFinalizing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const itensSelecionados = billingItems.filter(i => i.selecionado);
      const valorTotal = itensSelecionados.reduce((acc, i) => acc + i.valor_unitario, 0);

      // Criar cobrança no financeiro
      const { data: financeiro, error: finError } = await supabase
        .from('financeiro')
        .insert({
          consulta_id: consultaId,
          tutor_id: consulta.tutor_id || consulta.tutores?.id,
          descricao: `Atendimento - ${consulta.pets?.nome}`,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status: 'pendente',
          forma_pagamento: 'pix',
          criado_por: user?.id,
          data_vencimento: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (finError) throw finError;

      // Criar itens da cobrança
      if (itensSelecionados.length > 0) {
        const { error: itemsError } = await supabase
          .from('financeiro_itens')
          .insert(
            itensSelecionados.map(item => ({
              financeiro_id: financeiro.id,
              descricao: item.descricao,
              quantidade: 1,
              valor_unitario: item.valor_unitario
            }))
          );
        if (itemsError) throw itemsError;
      }

      // Atualizar status da consulta
      const { error: consultaError } = await supabase
        .from('consultas')
        .update({ status: 'concluido' })
        .eq('id', consultaId);
      
      if (consultaError) throw consultaError;

      toast({ title: 'Atendimento finalizado!', description: 'Cobrança gerada no financeiro.' });
      navigate('/prontuarios');
    } catch (err: any) {
      toast({ title: 'Erro ao finalizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
      setIsBillingModalOpen(false);
    }
  };

  const toggleItem = (index: number, checked: boolean) => {
    const newItems = [...billingItems];
    newItems[index].selecionado = checked;
    setBillingItems(newItems);
  };

  const handleAddMedicamento = async () => {
    if (!nomeMed || !consulta || !existingId) {
      toast({ title: 'Atenção', description: 'Informe o nome do medicamento.', variant: 'destructive' });
      return;
    }

    setAddingPrescricao(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const medicamentoSelecionado = medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId);
    
    // 1. Montar objeto do medicamento
    const novoMedicamento = {
      nome: nomeMed,
      dose,
      frequencia,
      duracao,
      via,
      preco: precoMedicamento || medicamentoSelecionado?.preco_venda || 0,
      venderNaClinica,
      quantidade: 1
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
        const quantidade = 1; 
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
            tipo: 'saida',
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
                      <Button type="button" onClick={handleFinalize} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isFinalizing}>
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

                      {venderNaClinica && (
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
                             <span className="text-xs text-muted-foreground italic">
                               (Padrão: R$ {medicamentoSelecionadoId ? medicamentosEstoque.find(m => m.id === medicamentoSelecionadoId)?.preco_venda : '0.00'})
                             </span>
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
                                {med.venderNaClinica && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 py-0 h-4">
                                      <Check className="w-2.5 h-2.5 mr-1" /> Venda na Clínica
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-green-600 text-sm">
                                  R$ {(med.preco || 0).toFixed(2)}
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

      {/* Modal de Confirmação de Cobrança */}
      <Dialog open={isBillingModalOpen} onOpenChange={setIsBillingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Itens da Cobrança</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-muted-foreground mb-4">
            Desmarque os itens que o tutor não vai adquirir na clínica hoje.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {billingItems.map((item, i) => (
              <div key={i} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${item.selecionado ? 'bg-white border-primary/20' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  {item.pode_desmarcar ? (
                    <Checkbox 
                      checked={item.selecionado}
                      onCheckedChange={(v) => toggleItem(i, !!v)}
                      className="border-primary"
                    />
                  ) : (
                    <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className={`font-medium text-sm ${item.selecionado ? 'text-foreground' : 'text-muted-foreground'}`}>{item.descricao}</p>
                    {!item.pode_desmarcar ? (
                      <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Item obrigatório</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground uppercase">Opcional</p>
                    )}
                  </div>
                </div>
                <p className={`font-bold text-sm ${item.selecionado ? 'text-green-600' : 'text-muted-foreground line-through'}`}>
                  R$ {item.valor_unitario.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Estimado</span>
              <span className="text-green-700 text-2xl">
                R$ {billingItems
                  .filter(i => i.selecionado)
                  .reduce((acc, i) => acc + i.valor_unitario, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button variant="outline" onClick={() => setIsBillingModalOpen(false)}>
              Voltar
            </Button>
            <Button onClick={confirmarFinalizacao} className="bg-green-600 hover:bg-green-700 flex-1" disabled={isFinalizing}>
              {isFinalizing ? 'Processando...' : 'Gerar Cobrança e Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
