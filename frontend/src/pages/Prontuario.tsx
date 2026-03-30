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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface Consulta {
  id: string;
  pet_id: string;
  data_hora: string;
  tipo: string;
  motivo: string;
  observacoes: string | null;
  status: string;
  pets: { nome: string; especie: string; raca: string } | null;
  tutores: { nome: string } | null;
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
  }[];
  observacoes: string | null;
  created_at: string;
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
      const { data } = await supabase.from('prescricoes').select('*').eq('prontuario_id', pId).order('created_at', { ascending: false });
      if (data) setPrescricoes(data as Prescricao[]);
    };

    const fetchData = async () => {
      const [consultaRes, prontuarioRes] = await Promise.all([
        supabase
          .from('consultas')
          .select(`
            id, pet_id, data_hora, tipo, status, motivo, observacoes,
            pets ( nome, especie, raca ),
            tutores ( nome )
          `)
          .eq('id', consultaId)
          .single(),
        supabase.from('prontuarios').select('*').eq('consulta_id', consultaId).maybeSingle(),
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
    };

    fetchData();
  }, [consultaId]);

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
    if (!consultaId) return;
    setIsFinalizing(true);
    
    const { error } = await supabase
      .from('consultas')
      .update({ status: 'concluido' })
      .eq('id', consultaId);

    if (error) {
      toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Atendimento finalizado!' });
      navigate('/prontuarios');
    }
    setIsFinalizing(false);
  };

  const handleAddMedicamento = async () => {
    if (!nomeMed || !consulta || !existingId) {
      toast({ title: 'Atenção', description: 'Informe o nome do medicamento.', variant: 'destructive' });
      return;
    }

    setAddingPrescricao(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('prescricoes').insert({
      pet_id: consulta.pet_id,
      prontuario_id: existingId,
      veterinario_id: user?.id,
      medicamentos: [{
        nome: nomeMed,
        dose: dose,
        frequencia: frequencia,
        duracao: duracao,
        via: via
      }],
      observacoes: observacoesPrescricao || null,
      data_emissao: new Date().toISOString().split('T')[0]
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setPrescricoes([data as Prescricao, ...prescricoes]);
      setNomeMed('');
      setDose('');
      setFrequencia('');
      setDuracao('');
      setVia('oral');
      setObservacoesPrescricao('');
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
      setVacinas([data as Vacina, ...vacinas]);
      setNomeVacina('');
      setFabricante('');
      setLote('');
      setDataAplicacao(new Date().toISOString().split('T')[0]);
      setDataReforco('');
      setObservacoesVacina('');
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
      setLaboratorio('');
      setDataSolicitacao(new Date().toISOString().split('T')[0]);
      setDataResultadoExame('');
      setResultadoExame('');
      setDescricaoExame('');
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
                      <div className="space-y-1">
                        <Label>Nome do Medicamento *</Label>
                        <Input 
                          placeholder="Ex: Amoxicilina" 
                          value={nomeMed} 
                          onChange={e => setNomeMed(e.target.value)} 
                        />
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
                
                {/* Lista de medicamentos adicionados */}
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground">Medicamentos Prescritos</h4>
                  {prescricoes.length === 0 ? (
                    <p className="text-sm text-center py-4 text-muted-foreground bg-gray-50/50 rounded-lg">Nenhum medicamento registrado.</p>
                  ) : (
                    <div className="grid gap-3">
                      {prescricoes.map((p, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-l-4 border-l-green-500 shadow-sm">
                          {p.medicamentos.map((m, idx) => (
                            <div key={idx}>
                              <p className="font-bold text-green-800">{m.nome} - {m.dose}</p>
                              <p className="text-sm text-gray-500">{m.frequencia} por {m.duracao} - Via {m.via}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
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
                        <Input placeholder="Ex: Hemograma Completo" value={tipoExame} onChange={e => setTipoExame(e.target.value)} />
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
                        <Label>Nome da Vacina *</Label>
                        <Input placeholder="Ex: V10, Antirrábica" value={nomeVacina} onChange={e => setNomeVacina(e.target.value)} />
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
