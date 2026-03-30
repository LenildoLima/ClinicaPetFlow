import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Save } from 'lucide-react';
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

  useEffect(() => {
    if (!consultaId) return;

    const fetchData = async () => {
      const [consultaRes, prontuarioRes] = await Promise.all([
        supabase.from('consultas').select('*, pets(nome, especie, raca), tutores(nome)').eq('id', consultaId).single(),
        supabase.from('prontuarios').select('*').eq('consulta_id', consultaId).maybeSingle(),
      ]);

      if (consultaRes.data) setConsulta(consultaRes.data as unknown as Consulta);
      if (prontuarioRes.data) {
        const p = prontuarioRes.data as unknown as Prontuario;
        setExistingId(p.id);
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

    const { error } = existingId
      ? await supabase.from('prontuarios').update(payload).eq('id', existingId)
      : await supabase.from('prontuarios').insert([payload]);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      // 1. Atualizar status da consulta para concluido
      await supabase
        .from('consultas')
        .update({ status: 'concluido' })
        .eq('id', consultaId);
        
      // 2. Mostrar mensagem de sucesso
      toast({ title: existingId ? 'Prontuário atualizado!' : 'Prontuário salvo com sucesso!' });
      
      // 3. Redirecionar para a listagem
      setTimeout(() => navigate('/prontuarios'), 1000);
    }
    setLoading(false);
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
    </div>
  );
}
