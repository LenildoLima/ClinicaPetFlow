import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

export default function Servicos() {
  const { userData } = useAuth();
  const { toast } = useToast();

  const [servicos, setServicos] = useState<any[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [servicoModalOpen, setServicoModalOpen] = useState(false);
  const [deleteServicoModalOpen, setDeleteServicoModalOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<any>(null);

  const fetchServicos = async () => {
    setLoadingServicos(true);
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('categoria', { ascending: true });
    
    if (error) {
      toast({ title: "Erro ao buscar serviços", description: error.message, variant: "destructive" });
    } else {
      setServicos(data || []);
    }
    setLoadingServicos(false);
  };

  useEffect(() => {
    if (userData?.cargo === 'admin') fetchServicos();
  }, [userData]);

  const handleToggleServico = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('servicos')
      .update({ ativo: !currentStatus })
      .eq('id', id);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status alterado com sucesso" });
      fetchServicos();
    }
  };

  const handleSaveServico = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const isEditing = !!selectedServico;
    const payload = {
      nome: formData.get("nome"),
      categoria: formData.get("categoria"),
      descricao: formData.get("descricao"),
      preco: parseFloat(formData.get("preco") as string || "0"),
      ativo: isEditing ? selectedServico.ativo : true,
    };

    const { error } = isEditing 
      ? await supabase.from('servicos').update(payload).eq('id', selectedServico.id)
      : await supabase.from('servicos').insert([payload]);

    if (error) {
      toast({ title: "Erro ao salvar serviço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Serviço atualizado" : "Serviço criado" });
      setServicoModalOpen(false);
      fetchServicos();
    }
  };

  const handleDeleteServico = async () => {
    if (!selectedServico) return;
    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', selectedServico.id);
    if (error) {
      toast({ title: "Erro ao excluir serviço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço excluído com sucesso" });
      setDeleteServicoModalOpen(false);
      fetchServicos();
    }
  };

  const getCategoriaBadge = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "consulta": return <Badge className="bg-blue-500">Consulta</Badge>;
      case "exame": return <Badge className="bg-purple-500">Exame</Badge>;
      case "cirurgia": return <Badge className="bg-red-500">Cirurgia</Badge>;
      case "vacina": return <Badge className="bg-green-500">Vacina</Badge>;
      case "medicamento": return <Badge className="bg-yellow-500 text-yellow-950">Medicamento</Badge>;
      case "banho_tosa": return <Badge className="bg-pink-500">Banho e Tosa</Badge>;
      case "outro": return <Badge className="bg-gray-500">Outro</Badge>;
      default: return <Badge variant="secondary">{cat || 'Indefinido'}</Badge>;
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (!userData) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos pela clínica.</p>
        </div>
        <Button onClick={() => { setSelectedServico(null); setServicoModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Serviço
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingServicos ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
            ) : servicos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum serviço encontrado.</TableCell></TableRow>
            ) : (
              servicos.map((servico) => (
                <TableRow key={servico.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell>
                    <p className="font-medium text-gray-900">{servico.nome}</p>
                    {servico.descricao && <p className="text-xs text-gray-500 line-clamp-1">{servico.descricao}</p>}
                  </TableCell>
                  <TableCell>{getCategoriaBadge(servico.categoria)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(servico.preco)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch 
                        checked={servico.ativo} 
                        onCheckedChange={() => handleToggleServico(servico.id, servico.ativo)}
                      />
                      <span className="text-xs text-muted-foreground w-12 text-left">
                        {servico.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setSelectedServico(servico); setServicoModalOpen(true); }}
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setSelectedServico(servico); setDeleteServicoModalOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Criar/Editar Serviço */}
      <Dialog open={servicoModalOpen} onOpenChange={setServicoModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Tag className="w-6 h-6" />
              {selectedServico ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <p className="text-primary-foreground/80 text-sm mt-1">
              Preencha os detalhes do serviço oferecido.
            </p>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSaveServico} className="p-6 space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label htmlFor="servico-nome" className="font-semibold">Nome do Serviço *</Label>
                  <Input className="bg-slate-50" id="servico-nome" name="nome" defaultValue={selectedServico?.nome || ""} required />
                </div>
                
                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label htmlFor="servico-categoria" className="font-semibold">Categoria *</Label>
                  <Select name="categoria" defaultValue={selectedServico?.categoria || "consulta"} required>
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="exame">Exame</SelectItem>
                      <SelectItem value="cirurgia">Cirurgia</SelectItem>
                      <SelectItem value="vacina">Vacina</SelectItem>
                      <SelectItem value="medicamento">Medicamento</SelectItem>
                      <SelectItem value="banho_tosa">Banho e Tosa</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label htmlFor="servico-preco" className="font-semibold">Preço (R$) *</Label>
                  <Input 
                    className="bg-slate-50"
                    id="servico-preco" 
                    name="preco" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    defaultValue={selectedServico?.preco || ""} 
                    required 
                  />
                </div>

                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                  <Label htmlFor="servico-descricao" className="font-semibold">Descrição (Opcional)</Label>
                  <Input className="bg-slate-50" id="servico-descricao" name="descricao" defaultValue={selectedServico?.descricao || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setServicoModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="h-12 rounded-xl shadow-md">Salvar</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir Serviço */}
      <AlertDialog open={deleteServicoModalOpen} onOpenChange={setDeleteServicoModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço <strong>{selectedServico?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteServico} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
