import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, MoreVertical, FileText, CalendarDays } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Consulta {
  id: string;
  data_hora: string;
  tipo: string;
  motivo: string;
  status: string;
  pets: { nome: string } | null;
  tutores: { nome: string } | null;
}

const statusColors: Record<string, string> = {
  agendado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmado: 'bg-warning/20 text-warning dark:text-warning-foreground',
  em_atendimento: 'bg-info/20 text-info dark:text-info-foreground',
  concluido: 'bg-success/20 text-success dark:text-success-foreground',
  cancelado: 'bg-destructive/10 text-destructive',
  faltou: 'bg-muted text-muted-foreground',
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

export default function MinhaAgenda() {
  const { user } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigate = useNavigate();

  const fetchConsultas = async () => {
    if (!user) return;
    
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
      .select('*, pets(nome), tutores(nome)')
      .eq('veterinario_id', user.id)
      .gte('data_hora', start.toISOString())
      .lte('data_hora', end.toISOString())
      .order('data_hora', { ascending: true });
    setConsultas((data as unknown as Consulta[]) ?? []);
  };

  useEffect(() => {
    fetchConsultas();
  }, [user, filterType, selectedDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe suas consultas agendadas
        </p>
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
            {filterType === 'today' && "Suas Consultas de Hoje"}
            {filterType === 'week' && "Suas Consultas desta Semana"}
            {filterType === 'month' && "Suas Consultas deste Mês"}
            {filterType === 'date' && `Suas Consultas de ${selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mb-2" />
              <p>Você não possui consultas agendadas para este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-primary min-w-[60px]">
                      {new Date(c.data_hora).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'America/Sao_Paulo'
                      })}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{c.pets?.nome ?? 'Pet'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(c.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} • {tipoLabels[c.tipo] || c.tipo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[c.status] ?? 'bg-muted text-muted-foreground'}>
                      {statusLabels[c.status] ?? c.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/prontuario/${c.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Abrir Prontuário
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
