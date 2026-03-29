import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Activity, Heart, Thermometer, Stethoscope, Pill, Beaker as Flask, Syringe, Printer, Plus, Save, ExternalLink } from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Prontuario {
  id: string;
  data_atendimento: string;
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
  pets: {
    nome: string;
    especie: string;
    raca: string;
    sexo: string;
    data_nascimento: string;
    castrado?: boolean;
    foto_url: string;
    tutores: { nome: string; telefone: string } | null;
  } | null;
  usuarios: { nome: string; crmv?: string } | null;
}

export default function ProntuarioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [exames, setExames] = useState<any[]>([]);
  const [vacinas, setVacinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Prontuario>>({});
  const [printMode, setPrintMode] = useState<'receita' | 'prontuario'>('receita');
  const printRef = useRef<HTMLDivElement>(null);

  const fetchItems = async (prontuarioId: string) => {
    const [prescRes, examRes, vacRes] = await Promise.all([
      supabase.from('prescricoes').select('*').eq('prontuario_id', prontuarioId),
      supabase.from('exames').select('*').eq('prontuario_id', prontuarioId),
      supabase.from('vacinas').select('*').eq('prontuario_id', prontuarioId)
    ]);
    setPrescricoes(prescRes.data || []);
    setExames(examRes.data || []);
    setVacinas(vacRes.data || []);
  };

  const fetchData = async () => {
    const { data } = await supabase
      .from('prontuarios')
      .select(`
        *,
        pets ( id, nome, especie, raca, sexo, data_nascimento, castrado, foto_url, tutores ( nome, telefone ) ),
        usuarios ( nome, crmv )
      `)
      .eq('id', id)
      .single();

    if (data) {
      const p = data as unknown as Prontuario;
      setProntuario(p);
      setEditForm(p);
      fetchItems(p.id);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const calcularIdade = (dataNasc: string) => {
    const d = new Date(dataNasc);
    const anos = differenceInYears(new Date(), d);
    if (anos > 0) return `${anos} anos`;
    const meses = differenceInMonths(new Date(), d);
    return `${meses} meses`;
  };

  const handlePrint = (mode: 'receita' | 'prontuario') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleUpdateProntuario = async () => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('prontuarios')
      .update({
        peso: editForm.peso,
        temperatura: editForm.temperatura,
        frequencia_cardiaca: editForm.frequencia_cardiaca,
        frequencia_respiratoria: editForm.frequencia_respiratoria,
        queixa_principal: editForm.queixa_principal,
        anamnese: editForm.anamnese,
        exame_fisico: editForm.exame_fisico,
        hipotese_diagnostica: editForm.hipotese_diagnostica,
        diagnostico: editForm.diagnostico,
        tratamento: editForm.tratamento,
        orientacoes: editForm.orientacoes,
        retorno_em: editForm.retorno_em,
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Prontuário atualizado com sucesso!' });
      setIsEditDialogOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando detalhes do prontuário...</div>;
  if (!prontuario) return <div className="p-8 text-center text-destructive">Prontuário não encontrado.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/prontuarios')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Prontuário</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePrint('prontuario')}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Prontuário
          </Button>
          <Button variant="outline" onClick={() => handlePrint('receita')}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Receita
          </Button>
          {(userData?.cargo === 'admin' || userData?.cargo === 'veterinario') && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button>Editar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Prontuário</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label>Peso (kg)</Label>
                      <Input value={editForm.peso} onChange={e => setEditForm({ ...editForm, peso: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Temp. (°C)</Label>
                      <Input value={editForm.temperatura} onChange={e => setEditForm({ ...editForm, temperatura: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>FC (bpm)</Label>
                      <Input value={editForm.frequencia_cardiaca} onChange={e => setEditForm({ ...editForm, frequencia_cardiaca: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>FR (mpm)</Label>
                      <Input value={editForm.frequencia_respiratoria} onChange={e => setEditForm({ ...editForm, frequencia_respiratoria: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Queixa Principal</Label>
                    <Input value={editForm.queixa_principal} onChange={e => setEditForm({ ...editForm, queixa_principal: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Anamnese</Label>
                    <Textarea value={editForm.anamnese} onChange={e => setEditForm({ ...editForm, anamnese: e.target.value })} rows={4} />
                  </div>
                  <div className="space-y-1">
                    <Label>Exame Físico</Label>
                    <Textarea value={editForm.exame_fisico} onChange={e => setEditForm({ ...editForm, exame_fisico: e.target.value })} rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Hipótese</Label>
                      <Input value={editForm.hipotese_diagnostica} onChange={e => setEditForm({ ...editForm, hipotese_diagnostica: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Diagnóstico</Label>
                      <Input value={editForm.diagnostico} onChange={e => setEditForm({ ...editForm, diagnostico: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Tratamento</Label>
                    <Textarea value={editForm.tratamento} onChange={e => setEditForm({ ...editForm, tratamento: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label>Orientações</Label>
                    <Textarea value={editForm.orientacoes} onChange={e => setEditForm({ ...editForm, orientacoes: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label>Retorno em</Label>
                    <Input type="date" value={editForm.retorno_em} onChange={e => setEditForm({ ...editForm, retorno_em: e.target.value })} />
                  </div>
                  <Button onClick={handleUpdateProntuario} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Cabeçalho do Pet */}
      <Card className="overflow-hidden border-none shadow-md bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
              <AvatarImage src={prontuario.pets?.foto_url} alt={prontuario.pets?.nome} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {prontuario.pets?.nome?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h2 className="text-3xl font-bold text-foreground">{prontuario.pets?.nome}</h2>
                <Badge variant="secondary" className="capitalize">{prontuario.pets?.especie}</Badge>
                <Badge variant="outline">{prontuario.pets?.raca}</Badge>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-foreground">Sexo:</span> {prontuario.pets?.sexo === 'M' ? 'Macho' : 'Fêmea'}
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-foreground">Idade:</span> {prontuario.pets?.data_nascimento ? calcularIdade(prontuario.pets.data_nascimento) : '—'}
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-foreground">Tutor:</span> {prontuario.pets?.tutores?.nome}
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-foreground">Telefone:</span> {prontuario.pets?.tutores?.telefone}
                </div>
              </div>
            </div>

            <div className="border-l pl-6 hidden lg:block space-y-1">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Atendimento em</p>
              <p className="text-lg font-semibold text-primary">
                {new Date(prontuario.data_atendimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
              <p className="text-sm font-medium">Dr(a). {prontuario.usuarios?.nome}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
            <Activity className="h-5 w-5 text-blue-500" />
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Peso</p>
            <p className="text-xl font-bold">{prontuario.peso} kg</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
            <Thermometer className="h-5 w-5 text-red-500" />
            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase">Temp.</p>
            <p className="text-xl font-bold">{prontuario.temperatura} °C</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
            <Heart className="h-5 w-5 text-rose-500" />
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">FC (bpm)</p>
            <p className="text-xl font-bold">{prontuario.frequencia_cardiaca || '—'}</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
            <Activity className="h-5 w-5 text-indigo-500" />
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">FR (mpm)</p>
            <p className="text-xl font-bold">{prontuario.frequencia_respiratoria || '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clinico" className="no-print">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/20">
          <TabsTrigger value="clinico" className="gap-2"><Stethoscope className="h-4 w-4" /> Clínico</TabsTrigger>
          <TabsTrigger value="prescricoes" className="gap-2"><Pill className="h-4 w-4" /> Prescrições</TabsTrigger>
          <TabsTrigger value="exames" className="gap-2"><Flask className="h-4 w-4" /> Exames</TabsTrigger>
          <TabsTrigger value="vacinas" className="gap-2"><Syringe className="h-4 w-4" /> Vacinas</TabsTrigger>
        </TabsList>

        <TabsContent value="clinico" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-4 bg-muted/10"><CardTitle className="text-base">Anamnese</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Queixa Principal</p>
                  <p className="text-sm whitespace-pre-wrap">{prontuario.queixa_principal || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Anamnese Completa</p>
                  <p className="text-sm whitespace-pre-wrap">{prontuario.anamnese || '—'}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4 bg-muted/10"><CardTitle className="text-base">Exame Físico</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{prontuario.exame_fisico || '—'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-4 bg-muted/10"><CardTitle className="text-base">Diagnóstico e Tratamento</CardTitle></CardHeader>
            <CardContent className="pt-4 grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Hipótese Diagnóstica</p>
                  <p className="text-sm font-medium">{prontuario.hipotese_diagnostica || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Diagnóstico Definitivo</p>
                  <p className="text-sm font-bold text-foreground">{prontuario.diagnostico || '—'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Tratamento Prescrito</p>
                  <p className="text-sm whitespace-pre-wrap">{prontuario.tratamento || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-1 text-primary">Orientações ao Tutor</p>
                  <p className="text-sm whitespace-pre-wrap">{prontuario.orientacoes || '—'}</p>
                </div>
              </div>
            </CardContent>
            {prontuario.retorno_em && (
              <div className="bg-primary/5 p-4 border-t flex items-center justify-between">
                <span className="text-sm font-bold text-primary italic">Sugestão de Retorno</span>
                <Badge variant="default">{new Date(prontuario.retorno_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</Badge>
              </div>
            )}
            <TabsContent value="prescricoes" className="pt-4">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Histórico de Prescrições</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova Prescrição</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Adicionar Medicamento</DialogTitle></DialogHeader>
                  <PrescricaoForm prontuario={prontuario} onSave={() => fetchItems(prontuario.id)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {prescricoes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8 italic">Nenhuma prescrição registrada.</p>
              ) : (
                <div className="space-y-4">
                  {prescricoes.map(p => (
                    <div key={p.id} className="border rounded-lg p-4 bg-muted/5">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold text-primary uppercase tracking-wider">Prescrição #{p.id.slice(0, 5)}</span>
                         <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {p.medicamentos?.map((m: any, idx: number) => (
                          <div key={idx} className="bg-white dark:bg-muted/20 p-3 rounded border border-l-4 border-l-primary">
                            <p className="font-bold text-foreground">{m.nome}</p>
                            <p className="text-sm text-muted-foreground">{m.dose} • {m.frequencia} • {m.duracao} • {m.via}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exames" className="pt-4">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Exames Solicitados</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Adicionar Exame</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Exame</DialogTitle></DialogHeader>
                  <ExameForm prontuario={prontuario} onSave={() => fetchItems(prontuario.id)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {exames.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8 italic">Nenhum exame registrado.</p>
              ) : (
                <div className="grid gap-3">
                  {exames.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                      <div>
                        <p className="font-bold text-sm">{e.tipo}</p>
                        <p className="text-xs text-muted-foreground">{e.laboratorio || 'Laboratório próprio'} • {e.data_solicitacao && format(new Date(e.data_solicitacao), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.arquivo_url && <Button variant="ghost" size="icon" onClick={() => window.open(e.arquivo_url)}><ExternalLink className="h-4 w-4" /></Button>}
                        <Badge variant={e.resultado ? 'default' : 'outline'}>{e.resultado ? 'Concluído' : 'Pendente'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacinas" className="pt-4">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vacinas Aplicadas</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Registrar Vacina</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Vacina</DialogTitle></DialogHeader>
                  <VacinaForm prontuario={prontuario} onSave={() => fetchItems(prontuario.id)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
               {vacinas.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8 italic">Nenhuma vacina registrada.</p>
              ) : (
                <div className="grid gap-3">
                  {vacinas.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/30 border-green-100">
                      <div>
                        <p className="font-bold text-sm text-green-700">{v.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{v.fabricante} • Lote: {v.lote} • Aplicada em: {format(new Date(v.data_aplicacao), 'dd/MM/yyyy')}</p>
                      </div>
                      {v.data_reforco && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-amber-600">Reforço em</p>
                          <p className="text-xs font-bold">{format(new Date(v.data_reforco), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          </Card>
        </TabsContent>
      </Tabs>

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          /* Esconder tudo por padrão */
          body * { 
            visibility: hidden; 
            overflow: visible !important;
          }
          
          /* Esconder explicitamente elementos indesejados */
          .no-print, header, nav, footer, aside, button { 
            display: none !important; 
          }

          /* Mostrar apenas o conteúdo de impressão correspondente */
          .print-container, .print-container *,
          .print-container-full, .print-container-full * { 
            visibility: visible; 
          }

          .print-container, .print-container-full {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            display: block !important;
            padding: 1cm;
            margin: 0;
            background: white;
            font-size: 12pt;
          }

          /* Garantir que cores apareçam */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Container de Impressão Oculto na tela, visível apenas na impressão */}
      <div className={`hidden bg-white p-8 ${printMode === 'receita' ? 'print-container' : 'print-container-full'}`} ref={printRef}>
        {printMode === 'receita' ? (
          <div className="space-y-8">
            <div className="flex justify-between border-b-2 border-primary pb-6">
              <div>
                <h1 className="text-4xl font-bold text-primary">PetFlow</h1>
                <p className="text-muted-foreground">Clínica Veterinária</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">Receituário Médico</p>
                <p>{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm bg-muted/20 p-4 rounded">
              <div>
                <p className="font-bold uppercase text-[10px]">Paciente</p>
                <p className="text-lg font-bold">{prontuario.pets?.nome}</p>
                <p>{prontuario.pets?.especie} - {prontuario.pets?.raca}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-[10px]">Tutor</p>
                <p className="text-lg font-bold">{prontuario.pets?.tutores?.nome}</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold border-l-4 border-primary pl-3 uppercase tracking-tight">Prescrição e Recomendações</h3>
              
              <div className="min-h-[500px] border-2 border-slate-100 p-8 rounded-xl font-serif text-lg leading-relaxed relative bg-slate-50/20">
                {/* Listagem de Prescrições Reais */}
                {prescricoes.length > 0 ? (
                  <div className="space-y-8">
                    {prescricoes.map((p, idx) => (
                      <div key={idx} className="space-y-4">
                        {p.medicamentos?.map((m: any, mIdx: number) => (
                          <div key={mIdx} className="border-b border-slate-200 pb-2">
                            <p className="font-bold text-xl uppercase">{mIdx + 1}. {m.nome}</p>
                            <p className="text-sm italic text-slate-600">
                              {m.dose} • {m.frequencia} • {m.duracao} • Via {m.via}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 text-slate-700">
                    <p className="font-bold underline">Uso Veterinário:</p>
                    <p className="whitespace-pre-wrap">{prontuario.tratamento || '—'}</p>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-dashed space-y-4">
                  <p className="font-bold text-sm uppercase">Orientações ao Tutor:</p>
                  <p className="text-base text-slate-700 italic">{prontuario.orientacoes || '—'}</p>
                  {prontuario.retorno_em && (
                    <p className="mt-4 text-sm font-bold text-primary">
                      Sugestão de Retorno: {new Date(prontuario.retorno_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </p>
                  )}
                </div>
                
                <div className="absolute bottom-4 right-8 opacity-10 rotate-[-15deg] pointer-events-none select-none">
                  <h1 className="text-6xl font-black">PETFLOW</h1>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-16 flex flex-col items-center gap-1">
              <div className="w-80 border-t-2 border-slate-800"></div>
              <p className="font-bold text-lg uppercase tracking-wider">Dr(a). {prontuario.usuarios?.nome}</p>
              <p className="text-sm font-medium text-slate-600">CRMV-{prontuario.usuarios?.crmv || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-slate-900">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
              <h1 className="text-2xl font-bold uppercase">Clínica Veterinária PetFlow</h1>
              <p className="text-sm font-bold">Data: {format(new Date(prontuario.data_atendimento), 'dd/MM/yyyy HH:mm')}</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm tracking-[0.2em] mb-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <h3 className="font-bold uppercase tracking-widest text-sm">Dados do Paciente</h3>
              <p className="font-bold text-sm tracking-[0.2em] mb-4">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <p><span className="font-bold">Pet:</span> {prontuario.pets?.nome}</p>
                <p><span className="font-bold">Espécie:</span> {prontuario.pets?.especie}</p>
                <p><span className="font-bold">Raça:</span> {prontuario.pets?.raca}</p>
                <p><span className="font-bold">Sexo:</span> {prontuario.pets?.sexo === 'M' ? 'Macho' : 'Fêmea'}</p>
                <p><span className="font-bold">Idade:</span> {prontuario.pets?.data_nascimento ? calcularIdade(prontuario.pets.data_nascimento) : '—'}</p>
                <p><span className="font-bold">Castrado:</span> {prontuario.pets?.castrado ? 'Sim' : 'Não'}</p>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-bold">Tutor:</span> {prontuario.pets?.tutores?.nome}</p>
                <p><span className="font-bold">Telefone:</span> {prontuario.pets?.tutores?.telefone}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm tracking-[0.2em] mb-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <h3 className="font-bold uppercase tracking-widest text-sm">Dados Clínicos</h3>
              <p className="font-bold text-sm tracking-[0.2em] mb-4">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                <p>Peso: {prontuario.peso} kg</p>
                <p>Temperatura: {prontuario.temperatura} °C</p>
                <p>Freq. Cardíaca: {prontuario.frequencia_cardiaca || '—'} bpm</p>
                <p>Freq. Respiratória: {prontuario.frequencia_respiratoria || '—'} mpm</p>
              </div>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-bold text-sm tracking-[0.2em] mb-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <h3 className="font-bold uppercase tracking-widest text-sm">Anamnese e Diagnóstico</h3>
              <p className="font-bold text-sm tracking-[0.2em] mb-4">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <div className="space-y-4 text-sm">
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Queixa Principal:</span> {prontuario.queixa_principal || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Anamnese:</span> {prontuario.anamnese || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Exame Físico:</span> {prontuario.exame_fisico || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Hipótese Diagnóstica:</span> {prontuario.hipotese_diagnostica || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Diagnóstico Definitivo:</span> {prontuario.diagnostico || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Tratamento:</span> {prontuario.tratamento || '—'}</div>
                <div><span className="font-bold block uppercase text-[10px] text-slate-600 mb-1 underline">Orientações:</span> {prontuario.orientacoes || '—'}</div>
                {prontuario.retorno_em && <div className="font-bold">DATA DE RETORNO: {format(new Date(prontuario.retorno_em), 'dd/MM/yyyy')}</div>}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm tracking-[0.2em] mb-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <h3 className="font-bold uppercase tracking-widest text-sm">Prescrição</h3>
              <p className="font-bold text-sm tracking-[0.2em] mb-4">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              {prescricoes.map((p, pIdx) => (
                <div key={pIdx} className="text-sm space-y-1">
                  {p.medicamentos?.map((m: any, mIdx: number) => (
                    <p key={mIdx}>{mIdx+1}. {m.nome} ({m.dose} - {m.frequencia} - {m.duracao})</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm tracking-[0.2em] mb-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <h3 className="font-bold uppercase tracking-widest text-sm">Exames e Vacinas</h3>
              <p className="font-bold text-sm tracking-[0.2em] mb-4">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                   <p className="font-bold mb-1 underline">Exames:</p>
                   {exames.length > 0 ? exames.map((e, idx) => <p key={idx}>- {e.tipo} ({e.resultado ? 'OK' : 'Pendente'})</p>) : <p className="italic">Nenhum exame solicitado.</p>}
                </div>
                <div>
                   <p className="font-bold mb-1 underline">Vacinas:</p>
                   {vacinas.length > 0 ? vacinas.map((v, idx) => <p key={idx}>- {v.nome} (Lote: {v.lote})</p>) : <p className="italic">Nenhuma vacina aplicada.</p>}
                </div>
              </div>
            </div>

            <div className="pt-20 flex flex-col items-center gap-1">
              <div className="w-64 border-t border-slate-900"></div>
              <p className="font-bold">Dr(a). {prontuario.usuarios?.nome}</p>
              <p className="text-xs">CRMV: {prontuario.usuarios?.crmv || '—'}</p>
              <p className="text-[10px] mt-4 italic uppercase">Assinatura do Profissional Responsável</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescricaoForm({ prontuario, onSave }: any) {
  const [medicamentos, setMedicamentos] = useState([{ nome: '', dose: '', frequencia: '', duracao: '', via: '' }]);
  const { toast } = useToast();

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('prescricoes').insert({
      prontuario_id: prontuario.id,
      pet_id: prontuario.pets.id,
      veterinario_id: user?.id,
      medicamentos
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Prescrição salva!' });
      onSave();
    }
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px] border rounded p-4">
        {medicamentos.map((m, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 mb-6 p-3 border-b relative">
            <div className="col-span-2"><Label>Medicamento</Label><Input value={m.nome} onChange={e => { const n = [...medicamentos]; n[i].nome = e.target.value; setMedicamentos(n); }} /></div>
            <div><Label>Dose</Label><Input value={m.dose} onChange={e => { const n = [...medicamentos]; n[i].dose = e.target.value; setMedicamentos(n); }} /></div>
            <div><Label>Frequência</Label><Input value={m.frequencia} onChange={e => { const n = [...medicamentos]; n[i].frequencia = e.target.value; setMedicamentos(n); }} /></div>
            <div><Label>Duração</Label><Input value={m.duracao} onChange={e => { const n = [...medicamentos]; n[i].duracao = e.target.value; setMedicamentos(n); }} /></div>
            <div><Label>Via</Label><Input value={m.via} onChange={e => { const n = [...medicamentos]; n[i].via = e.target.value; setMedicamentos(n); }} /></div>
          </div>
        ))}
      </ScrollArea>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setMedicamentos([...medicamentos, { nome: '', dose: '', frequencia: '', duracao: '', via: '' }])}>+ Item</Button>
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Salvar Prescrição</Button>
      </div>
    </div>
  );
}

function ExameForm({ prontuario, onSave }: any) {
  const [form, setForm] = useState({ tipo: '', laboratorio: '', data_solicitacao: format(new Date(), 'yyyy-MM-dd') });
  const { toast } = useToast();

  const handleSave = async () => {
    const { error } = await supabase.from('exames').insert({ ...form, prontuario_id: prontuario.id });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Exame registrado!' }); onSave(); }
  };

  return (
    <div className="space-y-4">
      <div><Label>Tipo de Exame</Label><Input value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} placeholder="Ex: Hemograma" /></div>
      <div><Label>Laboratório</Label><Input value={form.laboratorio} onChange={e => setForm({...form, laboratorio: e.target.value})} /></div>
      <div><Label>Data Solicitação</Label><Input type="date" value={form.data_solicitacao} onChange={e => setForm({...form, data_solicitacao: e.target.value})} /></div>
      <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" /> Registrar</Button>
    </div>
  );
}

function VacinaForm({ prontuario, onSave }: any) {
  const [form, setForm] = useState({ nome: '', fabricante: '', lote: '', data_aplicacao: format(new Date(), 'yyyy-MM-dd'), data_reforco: '' });
  const { toast } = useToast();

  const handleSave = async () => {
    const { error } = await supabase.from('vacinas').insert({ ...form, prontuario_id: prontuario.id });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Vacina registrada!' }); onSave(); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Label>Vacina</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: V10" /></div>
        <div><Label>Fabricante</Label><Input value={form.fabricante} onChange={e => setForm({...form, fabricante: e.target.value})} /></div>
        <div><Label>Lote</Label><Input value={form.lote} onChange={e => setForm({...form, lote: e.target.value})} /></div>
        <div><Label>Data Aplicação</Label><Input type="date" value={form.data_aplicacao} onChange={e => setForm({...form, data_aplicacao: e.target.value})} /></div>
        <div><Label>Reforço em</Label><Input type="date" value={form.data_reforco} onChange={e => setForm({...form, data_reforco: e.target.value})} /></div>
      </div>
      <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" /> Salvar Vacina</Button>
    </div>
  );
}
