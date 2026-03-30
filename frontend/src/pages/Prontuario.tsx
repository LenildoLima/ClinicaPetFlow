import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Save, Syringe, Microscope, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Consulta {
  id: string;
  pet_id: string;
  data_hora: string;
  tipo: string;
  motivo: string;
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
  fabricante: string;
  lote: string;
  data_aplicacao: string;
  data_reforco: string;
  observacoes: string;
}

interface Exame {
  id: string;
  tipo: string;
  laboratorio: string;
  data_solicitacao: string;
  data_resultado: string;
  resultado: string;
  observacoes: string;
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

  // Estados para Vacinas
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [newVacina, setNewVacina] = useState({
    nome: '',
    fabricante: '',
    lote: '',
    data_aplicacao: format(new Date(), 'yyyy-MM-dd'),
    data_reforco: '',
    observacoes: ''
  });
  const [addingVacina, setAddingVacina] = useState(false);

  // Estados para Exames
  const [exames, setExames] = useState<Exame[]>([]);
  const [newExame, setNewExame] = useState({
    tipo: '',
    laboratorio: '',
    data_solicitacao: format(new Date(), 'yyyy-MM-dd'),
    data_resultado: '',
    resultado: '',
    observacoes: ''
  });
  const [addingExame, setAddingExame] = useState(false);

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

    const fetchData = async () => {
      const [consultaRes, prontuarioRes] = await Promise.all([
        supabase.from('consultas').select('*, pets(nome, especie, raca), tutores(nome)').eq('id', consultaId).single(),
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
      // Após salvar o prontuário com sucesso, atualizar status da consulta
      if (consultaId) {
        await supabase
          .from('consultas')
          .update({ status: 'concluido' })
          .eq('id', consultaId);
      }
        
      // 2. Mostrar mensagem de sucesso
      toast({ title: existingId ? 'Prontuário atualizado!' : 'Prontuário salvo com sucesso!' });
      
      // 3. Redirecionar para a listagem
      setTimeout(() => navigate('/prontuarios'), 1000);
    }
    setLoading(false);
  };

  const handleAddVacina = async () => {
    if (!newVacina.nome || !consulta) {
      toast({ title: 'Atenção', description: 'O nome da vacina é obrigatório', variant: 'destructive' });
      return;
    }

    setAddingVacina(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('vacinas').insert({
      pet_id: consulta.pet_id,
      veterinario_id: user?.id,
      nome: newVacina.nome,
      fabricante: newVacina.fabricante,
      lote: newVacina.lote,
      data_aplicacao: newVacina.data_aplicacao,
      data_reforco: newVacina.data_reforco || null,
      observacoes: newVacina.observacoes
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setVacinas([data as Vacina, ...vacinas]);
      setNewVacina({
        nome: '', fabricante: '', lote: '',
        data_aplicacao: format(new Date(), 'yyyy-MM-dd'),
        data_reforco: '', observacoes: ''
      });
      toast({ title: 'Sucesso', description: 'Vacina adicionada com sucesso!' });
    }
    setAddingVacina(false);
  };

  const handleAddExame = async () => {
    if (!newExame.tipo || !consulta || !existingId) {
      toast({ title: 'Atenção', description: !existingId ? 'Salve o prontuário primeiro para adicionar exames.' : 'Informe o tipo do exame.', variant: !existingId ? 'default' : 'destructive' });
      return;
    }

    setAddingExame(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('exames').insert({
      pet_id: consulta.pet_id,
      prontuario_id: existingId,
      veterinario_id: user?.id,
      tipo: newExame.tipo,
      laboratorio: newExame.laboratorio,
      data_solicitacao: newExame.data_solicitacao,
      data_resultado: newExame.data_resultado || null,
      resultado: newExame.resultado,
      observacoes: newExame.observacoes
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setExames([data as Exame, ...exames]);
      setNewExame({
        tipo: '', laboratorio: '', 
        data_solicitacao: format(new Date(), 'yyyy-MM-dd'),
        data_resultado: '', resultado: '', observacoes: ''
      });
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
        </CardContent>
      </Card>

      <Card className="shadow-sm">
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
                <Input type="text" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} placeholder="Ex: 5.2" />
              </div>
              <div className="space-y-1">
                <Label>Temperatura (°C)</Label>
                <Input type="text" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} placeholder="Ex: 38.5" />
              </div>
              <div className="space-y-1">
                <Label>FC (bpm)</Label>
                <Input type="text" value={form.frequencia_cardiaca} onChange={(e) => setForm({ ...form, frequencia_cardiaca: e.target.value })} placeholder="Ex: 80" />
              </div>
              <div className="space-y-1">
                <Label>FR (mpm)</Label>
                <Input type="text" value={form.frequencia_respiratoria} onChange={(e) => setForm({ ...form, frequencia_respiratoria: e.target.value })} placeholder="Ex: 20" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Queixa Principal</Label>
              <Input value={form.queixa_principal} onChange={(e) => setForm({ ...form, queixa_principal: e.target.value })} placeholder="Ex: Coceira excessiva nas orelhas" />
            </div>

            <div className="space-y-1">
              <Label>Anamnese</Label>
              <Textarea value={form.anamnese} onChange={(e) => setForm({ ...form, anamnese: e.target.value })} placeholder="Histórico do paciente, início dos sintomas..." rows={4} />
            </div>

            <div className="space-y-1">
              <Label>Exame Físico</Label>
              <Textarea value={form.exame_fisico} onChange={(e) => setForm({ ...form, exame_fisico: e.target.value })} placeholder="Observações do exame físico..." rows={4} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Hipótese Diagnóstica</Label>
                <Input value={form.hipotese_diagnostica} onChange={(e) => setForm({ ...form, hipotese_diagnostica: e.target.value })} placeholder="Ex: Otite externa" />
              </div>
              <div className="space-y-1">
                <Label>Diagnóstico Definitivo</Label>
                <Input value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} placeholder="Ex: Otite fúngica por Malassezia" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tratamento</Label>
              <Textarea value={form.tratamento} onChange={(e) => setForm({ ...form, tratamento: e.target.value })} placeholder="Descreva o tratamento prescrito..." rows={3} />
            </div>

            <div className="space-y-1">
              <Label>Orientações ao Tutor</Label>
              <Textarea value={form.orientacoes} onChange={(e) => setForm({ ...form, orientacoes: e.target.value })} placeholder="Orientações de cuidado em casa..." rows={3} />
            </div>

            <div className="space-y-1">
              <Label>Data de Retorno (Sugestão)</Label>
              <Input type="date" value={form.retorno_em} onChange={(e) => setForm({ ...form, retorno_em: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {existingId ? 'Atualizar Prontuário' : 'Salvar Prontuário'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SEÇÃO DE VACINAS */}
      <Card className="shadow-sm border-green-100">
        <CardHeader className="bg-green-50/50">
          <CardTitle className="flex items-center gap-2 text-lg text-green-800">
            <Syringe className="h-5 w-5" />
            Vacinas Aplicadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-dashed">
            <div className="space-y-1">
              <Label>Nome da Vacina *</Label>
              <Input value={newVacina.nome} onChange={e => setNewVacina({...newVacina, nome: e.target.value})} placeholder="V10, Antirrábica..." />
            </div>
            <div className="space-y-1">
              <Label>Fabricante / Lote</Label>
              <div className="flex gap-2">
                <Input value={newVacina.fabricante} onChange={e => setNewVacina({...newVacina, fabricante: e.target.value})} placeholder="Fabr." />
                <Input value={newVacina.lote} onChange={e => setNewVacina({...newVacina, lote: e.target.value})} placeholder="Lote" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data Aplicação *</Label>
              <Input type="date" value={newVacina.data_aplicacao} onChange={e => setNewVacina({...newVacina, data_aplicacao: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Próximo Reforço</Label>
              <Input type="date" value={newVacina.data_reforco} onChange={e => setNewVacina({...newVacina, data_reforco: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Observações</Label>
              <Input value={newVacina.observacoes} onChange={e => setNewVacina({...newVacina, observacoes: e.target.value})} placeholder="Notas adicionais..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={handleAddVacina} disabled={addingVacina} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Vacina
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              Histórico de Vacinas desta consulta
            </h4>
            {vacinas.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground bg-gray-50/50 rounded-lg">Nenhuma vacina registrada agora.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Aplicação</th>
                      <th className="text-left p-3 font-medium">Reforço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vacinas.map(v => (
                      <tr key={v.id}>
                        <td className="p-3 font-medium">{v.nome}</td>
                        <td className="p-3">{format(new Date(v.data_aplicacao), 'dd/MM/yyyy')}</td>
                        <td className="p-3">{v.data_reforco ? format(new Date(v.data_reforco), 'dd/MM/yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO DE EXAMES */}
      <Card className="shadow-sm border-blue-100">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
            <Microscope className="h-5 w-5" />
            Exames Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {!existingId && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
              Salve o prontuário primeiro para poder vincular solicitações de exames.
            </div>
          )}
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-dashed ${!existingId ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-1">
              <Label>Tipo de Exame *</Label>
              <Input value={newExame.tipo} onChange={e => setNewExame({...newExame, tipo: e.target.value})} placeholder="Hemograma, Raio-X..." />
            </div>
            <div className="space-y-1">
              <Label>Laboratório / Clínica</Label>
              <Input value={newExame.laboratorio} onChange={e => setNewExame({...newExame, laboratorio: e.target.value})} placeholder="Nome do laboratório" />
            </div>
            <div className="space-y-1">
              <Label>Data Solicitação</Label>
              <Input type="date" value={newExame.data_solicitacao} onChange={e => setNewExame({...newExame, data_solicitacao: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Expectativa Resultado</Label>
              <Input type="date" value={newExame.data_resultado} onChange={e => setNewExame({...newExame, data_resultado: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Resultado / Observações</Label>
              <Textarea value={newExame.resultado} onChange={e => setNewExame({...newExame, resultado: e.target.value})} placeholder="Informações iniciais ou resultado se disponível..." rows={2} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleAddExame} disabled={addingExame} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Exame
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Exames deste prontuário</h4>
            {exames.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground bg-gray-50/50 rounded-lg">Nenhum exame solicitado neste atendimento.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Laboratório</th>
                      <th className="text-left p-3 font-medium">Solicitado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {exames.map(ex => (
                      <tr key={ex.id}>
                        <td className="p-3 font-medium">{ex.tipo}</td>
                        <td className="p-3">{ex.laboratorio || 'Não inf.'}</td>
                        <td className="p-3">{format(new Date(ex.data_solicitacao), 'dd/MM/yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
