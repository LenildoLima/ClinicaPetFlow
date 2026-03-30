import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Settings, Plus, Edit2, Trash2, Camera, Save, UserCircle } from "lucide-react";

export default function Configuracoes() {
  const { user, userData, refreshUserData } = useAuth();
  const { toast } = useToast();
  
  // Definição das abas visíveis baseadas no cargo
  const abasDisponiveis = [
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircle, roles: ['admin', 'veterinario', 'recepcionista'] },
    { id: 'usuarios', label: 'Usuários', icon: Users, roles: ['admin'] },
    { id: 'servicos', label: 'Serviços', icon: Settings, roles: ['admin'] },
  ].filter(aba => userData && aba.roles.includes(userData.cargo));

  // O activeTab padrão será a primeira aba disponível (perfil para todos)
  const [activeTab, setActiveTab] = useState(abasDisponiveis.length > 0 ? abasDisponiveis[0].id : "perfil");

  useEffect(() => {
    // Garantir que a aba ativa seja resolvida se userData demorar para carregar
    if (userData && !abasDisponiveis.find(a => a.id === activeTab)) {
      setActiveTab(abasDisponiveis[0]?.id || "perfil");
    }
  }, [userData, activeTab, abasDisponiveis]);

  // ==========================================
  // ESTADOS E LÓGICA - ABA MEU PERFIL
  // ==========================================
  const [nomePerfil, setNomePerfil] = useState('');
  const [telefonePerfil, setTelefonePerfil] = useState('');
  const [whatsappPerfil, setWhatsappPerfil] = useState('');
  const [loadingDadosPerfil, setLoadingDadosPerfil] = useState(false);

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  useEffect(() => {
    if (userData) {
      setNomePerfil(userData.nome || '');
      setTelefonePerfil(userData.telefone || '');
      setWhatsappPerfil(userData.whatsapp || '');
    }
  }, [userData]);

  const handleSaveDadosPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingDadosPerfil(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nomePerfil, telefone: telefonePerfil, whatsapp: whatsappPerfil })
      .eq('id', user.id);

    if (error) {
      toast({ title: "Erro ao salvar dados", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados com sucesso", className: "bg-green-500 text-white" });
      refreshUserData();
    }
    setLoadingDadosPerfil(false);
  };

  const handleFotoClick = () => fileInputRef.current?.click();

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user) return;
      setUploadingFoto(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({ title: "Foto atualizada com sucesso!", className: "bg-green-500 text-white" });
      refreshUserData();
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSaveSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmaSenha) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    setLoadingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso", className: "bg-green-500 text-white" });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaSenha('');
    }
    setLoadingSenha(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ==========================================
  // ESTADOS E LÓGICA - ABA USUÁRIOS
  // ==========================================
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [editUsuarioModalOpen, setEditUsuarioModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) {
      toast({ title: "Erro ao buscar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsuarios(data || []);
    }
    setLoadingUsuarios(false);
  };

  const handleToggleUsuario = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: !currentStatus })
      .eq('id', id);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status alterado com sucesso" });
      fetchUsuarios();
    }
  };

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      cargo: formData.get("cargo"),
      crmv: formData.get("cargo") === "veterinario" ? formData.get("crmv") : null,
    };

    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', selectedUsuario.id);

    if (error) {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado com sucesso" });
      setEditUsuarioModalOpen(false);
      fetchUsuarios();
    }
  };

  // ==========================================
  // ESTADOS E LÓGICA - ABA SERVIÇOS
  // ==========================================
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

  // Efeitos para carregar dados das abas administrativas
  useEffect(() => {
    if (activeTab === "usuarios" && userData?.cargo === 'admin') fetchUsuarios();
    if (activeTab === "servicos" && userData?.cargo === 'admin') fetchServicos();
  }, [activeTab, userData]);

  // ==========================================
  // HELPERS (BADGES, DINHEIRO)
  // ==========================================
  const getCargoBadge = (cargo: string) => {
    switch (cargo?.toLowerCase()) {
      case "admin": return <Badge className="bg-purple-500 hover:bg-purple-600">Administrador</Badge>;
      case "veterinario": return <Badge className="bg-blue-500 hover:bg-blue-600">Veterinário</Badge>;
      case "recepcionista": return <Badge className="bg-green-500 hover:bg-green-600">Recepcionista</Badge>;
      default: return <Badge variant="outline">{cargo}</Badge>;
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

  if (!user || !userData) {
    return <div className="p-8 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            {userData.cargo === 'admin' 
              ? 'Gerenciamento de conta, usuários e serviços do sistema.'
              : 'Gerencie suas informações pessoais e de segurança da conta.'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {abasDisponiveis.map(aba => (
            <TabsTrigger key={aba.id} value={aba.id} className="flex items-center gap-2">
              <aba.icon className="w-4 h-4" /> {aba.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* =======================================================
                                MEU PERFIL
        ======================================================= */}
        <TabsContent value="perfil" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            {/* COLUNA ESQUERDA: FOTO E DETALHES DE CONTA */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
                  <div className="relative group cursor-pointer" onClick={handleFotoClick}>
                    <Avatar className="w-24 h-24 border-4 border-white shadow-xl bg-gray-100">
                      <AvatarImage src={userData.foto_url || undefined} alt="Foto de perfil" className="object-cover" />
                      <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                        {userData.nome?.substring(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFotoChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleFotoClick} 
                      disabled={uploadingFoto}
                    >
                      {uploadingFoto ? 'Enviando...' : 'Alterar Foto'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${userData.ativo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">{userData.ativo ? 'Ativa' : 'Inativa'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Membro desde</p>
                    <p className="text-sm">{userData.criado_em ? formatDate(userData.criado_em) : '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUNA DIREITA: DADOS PESSOAIS E SENHA */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais</CardTitle>
                  <CardDescription>Atualize suas informações de contato básicas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveDadosPerfil} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input id="nome" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" value={telefonePerfil} onChange={(e) => setTelefonePerfil(e.target.value)} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input id="whatsapp" value={whatsappPerfil} onChange={(e) => setWhatsappPerfil(e.target.value)} placeholder="(DD) 90000-0000" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-gray-500">Email (somente leitura)</Label>
                        <Input id="email" value={userData.email} readOnly className="bg-gray-50 text-gray-500" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cargo" className="text-gray-500">Cargo (somente leitura)</Label>
                        <Input id="cargo" value={userData.cargo} readOnly className="bg-gray-50 text-gray-500 capitalize" />
                      </div>

                      {userData.cargo === 'veterinario' && (
                        <div className="space-y-2">
                          <Label htmlFor="crmv" className="text-gray-500">CRMV (somente leitura)</Label>
                          <Input id="crmv" value={userData.crmv || '-'} readOnly className="bg-gray-50 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4">
                      <Button type="submit" disabled={loadingDadosPerfil} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto gap-2">
                        <Save className="w-4 h-4" /> 
                        {loadingDadosPerfil ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>Para sua segurança, recomendamos senhas fortes e únicas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSenha} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senhaAtual">Senha Atual</Label>
                      <Input id="senhaAtual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="novaSenha">Nova Senha</Label>
                        <Input id="novaSenha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmaSenha">Confirmar Nova Senha</Label>
                        <Input id="confirmaSenha" type="password" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} required />
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button type="submit" disabled={loadingSenha} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto gap-2">
                        <Save className="w-4 h-4" /> 
                        {loadingSenha ? 'Alterando...' : 'Alterar Senha'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* =======================================================
                                USUÁRIOS
        ======================================================= */}
        {userData.cargo === 'admin' && (
          <TabsContent value="usuarios" className="space-y-4">
            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsuarios ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                  ) : usuarios.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhum usuário encontrado.</TableCell></TableRow>
                  ) : (
                    usuarios.map((usr) => (
                      <TableRow key={usr.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={usr.foto_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {usr.nome?.substring(0, 2).toUpperCase() || "US"}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{usr.nome}</TableCell>
                        <TableCell className="text-gray-500">{usr.email}</TableCell>
                        <TableCell>{usr.telefone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {getCargoBadge(usr.cargo)}
                            {usr.cargo === "veterinario" && usr.crmv && (
                              <span className="text-xs text-muted-foreground">CRMV: {usr.crmv}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch 
                              checked={usr.ativo} 
                              onCheckedChange={() => handleToggleUsuario(usr.id, usr.ativo)}
                              title={usr.ativo ? "Desativar usuário" : "Ativar usuário"}
                            />
                            <span className="text-xs text-muted-foreground w-12 text-left">
                              {usr.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setSelectedUsuario(usr); setEditUsuarioModalOpen(true); }}
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        {/* =======================================================
                                SERVIÇOS
        ======================================================= */}
        {userData.cargo === 'admin' && (
          <TabsContent value="servicos" className="space-y-4">
            <div className="flex justify-end">
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
          </TabsContent>
        )}
      </Tabs>


      {/* =======================================================
                          MODAIS DE USUÁRIOS
      ======================================================= */}
      {userData.cargo === 'admin' && (
        <Dialog open={editUsuarioModalOpen} onOpenChange={setEditUsuarioModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {selectedUsuario && (
              <form onSubmit={handleSaveUsuario} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-nome">Nome</Label>
                  <Input id="modal-nome" name="nome" defaultValue={selectedUsuario.nome} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-email">E-mail</Label>
                  <Input id="modal-email" name="email" defaultValue={selectedUsuario.email} readOnly className="bg-gray-50 text-gray-500" />
                  <p className="text-[10px] text-gray-500">O e-mail não pode ser alterado por aqui.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-telefone">Telefone</Label>
                  <Input id="modal-telefone" name="telefone" defaultValue={selectedUsuario.telefone || ""} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modal-cargo">Cargo</Label>
                  <Select name="cargo" defaultValue={selectedUsuario.cargo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedUsuario.cargo === "admin" && <SelectItem value="admin">Administrador</SelectItem>}
                      <SelectItem value="veterinario">Veterinário</SelectItem>
                      <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedUsuario.cargo === "veterinario" && (
                  <div className="space-y-2">
                    <Label htmlFor="modal-crmv">CRMV</Label>
                    <Input id="modal-crmv" name="crmv" defaultValue={selectedUsuario.crmv || ""} />
                  </div>
                )}

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setEditUsuarioModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}


      {/* =======================================================
                          MODAIS DE SERVIÇOS
      ======================================================= */}
      {userData.cargo === 'admin' && (
        <>
          <Dialog open={servicoModalOpen} onOpenChange={setServicoModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{selectedServico ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveServico} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="servico-nome">Nome do Serviço</Label>
                  <Input id="servico-nome" name="nome" defaultValue={selectedServico?.nome || ""} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="servico-categoria">Categoria</Label>
                  <Select name="categoria" defaultValue={selectedServico?.categoria || "consulta"} required>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="servico-preco">Preço (R$)</Label>
                  <Input 
                    id="servico-preco" 
                    name="preco" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    defaultValue={selectedServico?.preco || ""} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servico-descricao">Descrição (Opcional)</Label>
                  <Input id="servico-descricao" name="descricao" defaultValue={selectedServico?.descricao || ""} />
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setServicoModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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
        </>
      )}

    </div>
  );
}
