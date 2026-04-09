import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar as CalendarIcon, Clock, MoreVertical, FileText, CalendarDays } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Tutor { id: string; nome: string }
interface Pet { id: string; nome: string; tutor_id: string }
interface Consulta {
  id: string;
  data_hora: string;
  tipo: string;
  motivo: string;
  status: string;
  tutor_id: string;
  pet_id: string;
  pets: { nome: string } | null;
  tutores: { nome: string } | null;
}
interface Usuario { id: string; nome: string }

const statusColors: Record<string, string> = {
  agendado: 'badge-info-vivid',
  confirmado: 'badge-warning-vivid',
  em_atendimento: 'badge-warning-vivid',
  concluido: 'badge-success-vivid',
  cancelado: 'badge-danger-vivid',
  faltou: 'bg-muted text-muted-foreground border-slate-200',
};

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
};

const tipoLabels: Record<string, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  cirurgia: 'Cirurgia',
  exame: 'Exame',
  vacina: 'Vacina',
  banho_tosa: 'Banho e Tosa',
  emergencia: 'Emergência',
};

const emptyForm = { tutor_id: '', pet_id: '', veterinario_id: '', data_hora: '', tipo: 'consulta', motivo: '', observacoes: '' };

export default function Agenda() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [veterinarios, setVeterinarios] = useState<Usuario[]>([]);
  const [tutorSearch, setTutorSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigate = useNavigate();

  const fetchConsultas = async () => {
    setLoading(true);
    try {
      let start, end;
      const now = new Date();

      if (filterType === 'today') {
        start = startOfDay(now);
        end = endOfDay(now);
      } else if (filterType === 'week') {
        start = startOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
        end = endOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
      } else if (filterType === 'month') {
        start = startOfMonth(now);
        end = endOfMonth(now);
      } else {
        const date = selectedDate || new Date();
        start = startOfDay(date);
        end = endOfDay(date);
      }

      const { data } = await supabase
        .from('consultas')
        .select('*, pets(nome), tutores(nome), prontuarios(id)')
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString())
        .order('data_hora', { ascending: true });
        
      const formatadas = ((data as any[]) || []).map(c => ({
        ...c,
        status: (c.prontuarios && c.prontuarios.length > 0) ? 'concluido' : c.status
      }));
      setConsultas(formatadas);
    } finally {
      setLoading(false);
    }
  };

  const fetchTutores = async () => {
    let query = supabase.from('tutores').select('id, nome').order('nome');
    if (tutorSearch) query = query.ilike('nome', `%${tutorSearch}%`);
    const { data } = await query;
    setTutores(data ?? []);
  };

  const fetchPetsByTutor = async (tutorId: string) => {
    const { data } = await supabase.from('pets').select('id, nome, tutor_id').eq('tutor_id', tutorId).order('nome');
    setPets(data ?? []);
  };

  const fetchVeterinarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nome').eq('cargo', 'veterinario').order('nome');
    setVeterinarios(data ?? []);
  };

  useEffect(() => { 
    fetchConsultas(); 

    // Escutar mudanças em tempo real para a agenda geral
    const canal = supabase
      .channel('agenda-geral')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultas' },
        () => {
          console.log('Realtime: Agenda geral atualizada');
          fetchConsultas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [filterType, selectedDate]);
  useEffect(() => { fetchTutores(); }, [tutorSearch]);
  useEffect(() => { fetchVeterinarios(); }, []);
  useEffect(() => {
    if (form.tutor_id) fetchPetsByTutor(form.tutor_id);
    else setPets([]);
  }, [form.tutor_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('consultas').insert([{
      tutor_id: form.tutor_id,
      pet_id: form.pet_id,
      veterinario_id: form.veterinario_id,
      data_hora: new Date(`${form.data_hora}:00-03:00`).toISOString(),
      tipo: form.tipo,
      motivo: form.motivo,
      observacoes: form.observacoes,
      status: 'agendado',
      criado_por: user?.id,
    }]);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta agendada com sucesso!' });
      setForm(emptyForm);
      setTutorSearch('');
      setOpen(false);
      fetchConsultas();
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('consultas').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      fetchConsultas();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Consulta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="bg-primary p-6">
              <DialogTitle className="flex items-center gap-2 text-white text-xl">
                <CalendarIcon className="w-6 h-6" />
                Agendar Nova Consulta
              </DialogTitle>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Preencha os dados abaixo para reservar um horário.
              </p>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6 bg-slate-50/50">
                
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="flex items-center gap-2 font-semibold">Tutor Responsável</Label>
                    <Input
                      placeholder="Buscar tutor por nome..."
                      value={tutorSearch}
                      onChange={(e) => setTutorSearch(e.target.value)}
                      className="mb-2 bg-slate-50 border-slate-200"
                    />
                    <Select value={form.tutor_id} onValueChange={(v) => setForm({ ...form, tutor_id: v, pet_id: '' })}>
                      <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione o tutor da lista" /></SelectTrigger>
                      <SelectContent>
                        {tutores.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Pet do Tutor</Label>
                    <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })} disabled={!form.tutor_id}>
                      <SelectTrigger className={!form.tutor_id ? "bg-slate-100 text-slate-400" : "bg-slate-50"}><SelectValue placeholder={form.tutor_id ? 'Selecione o pet' : 'Selecione um tutor primeiro'} /></SelectTrigger>
                      <SelectContent>
                        {pets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="flex items-center gap-2 font-semibold">Tipo de Atendimento</Label>
                      <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(tipoLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5 focus-within:text-primary transition-colors">
                      <Label className="flex items-center gap-2 font-semibold">Veterinário</Label>
                      <Select value={form.veterinario_id} onValueChange={(v) => setForm({ ...form, veterinario_id: v })}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Responsável" /></SelectTrigger>
                        <SelectContent>
                          {veterinarios.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:text-primary transition-colors col-span-1 md:col-span-2">
                      <Label className="flex items-center gap-2 font-semibold">Data e Horário</Label>
                      <Input type="datetime-local" className="bg-slate-50 text-base py-5" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} required />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold">Motivo Principal</Label>
                    <Input className="bg-slate-50" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ex: Consulta de rotina, vacinação, retorno..." required />
                  </div>

                  <div className="space-y-1.5 focus-within:text-primary transition-colors">
                    <Label className="font-semibold text-slate-500">Observações Extras (Opcional)</Label>
                    <Textarea className="bg-slate-50 resize-none" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Alguma particularidade importante?" rows={2} />
                  </div>
                </div>

                <Button type="submit" className="w-full text-lg h-12 rounded-xl shadow-md hover:shadow-lg transition-all" disabled={loading}>
                  {loading ? 'Salvando...' : 'Confirmar Agendamento'}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white/50 dark:bg-muted/20 p-1.5 rounded-xl border shadow-sm backdrop-blur-sm">
        <Button 
          variant={filterType === 'today' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('today')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'today' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Hoje
        </Button>
        <Button 
          variant={filterType === 'week' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('week')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'week' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          Esta Semana
        </Button>
        <Button 
          variant={filterType === 'month' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setFilterType('month')}
          className={cn(
            "rounded-lg transition-all",
            filterType === 'month' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
          )}
        >
          Este Mês
        </Button>
        <div className="flex items-center gap-2 ml-auto pr-1">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterType === 'date' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-9 justify-start text-left font-normal rounded-lg px-3",
                  filterType === 'date' && "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate && filterType === 'date' ? (
                  format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  "Selecionar data"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setFilterType('date');
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            {filterType === 'today' && "Consultas de Hoje"}
            {filterType === 'week' && "Consultas desta Semana"}
            {filterType === 'month' && "Consultas deste Mês"}
            {filterType === 'date' && `Consultas de ${selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-16" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mb-2" />
              <p>Nenhuma consulta agendada para este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 table-header-premium rounded-t-lg">
                <div className="col-span-1">Hora</div>
                <div className="col-span-4">Paciente</div>
                <div className="col-span-4">Detalhes do Atendimento</div>
                <div className="col-span-3 text-right">Status / Ações</div>
              </div>
              {consultas.map((c) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 rounded-xl border border-slate-100 p-4 table-row-premium group transition-all">
                  <div className="col-span-1">
                    <span className="text-lg font-black text-primary block">
                      {new Date(c.data_hora).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'America/Sao_Paulo'
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(c.data_hora), 'dd MMM', { locale: ptBR })}</span>
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold border border-primary/10">
                      {c.pets?.nome?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-primary-vivid text-base capitalize">{c.pets?.nome || (c.pets?.nome ?? 'Pet')}</p>
                      <p className="text-[11px] text-secondary-vivid font-bold">{c.tutores?.nome ?? '—'}</p>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-1">
                      {tipoLabels[c.tipo] || c.tipo}
                    </Badge>
                    <p className="text-xs text-slate-400 italic truncate max-w-[250px]">{c.motivo || 'Sem motivo detalhado'}</p>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-3">
                    <Badge className={`${statusColors[c.status]} uppercase text-[9px] tracking-wider px-2.5 py-1`}>
                      {statusLabels[c.status] ?? c.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <DropdownMenuItem key={key} onClick={() => updateStatus(c.id, key)}>
                            {label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => navigate(`/prontuario/${c.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Prontuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
