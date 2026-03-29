import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PawPrint, Loader2, Camera, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  role: z.enum(['veterinario', 'recepcionista']),
  crmv: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'veterinario' && !data.crmv) return false;
  return true;
}, {
  message: "CRMV é obrigatório para veterinários",
  path: ["crmv"],
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const formatPhone = (value: string) => {
  if (!value) return "";
  const phone = value.replace(/\D/g, "");
  if (phone.length <= 2) return `(${phone}`;
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
};

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(isSignUp ? signupSchema : loginSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      role: 'recepcionista',
      crmv: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = form.watch('role');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string) => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId}/avatar-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, imageFile);

    if (uploadError) {
      throw new Error(`Erro ao subir imagem: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    console.log('Iniciando submissão...', { isSignUp, hasImage: !!imageFile });
    
    try {
      if (isSignUp) {
        // 1. Create Auth User First
        const { error: authError, data: authData } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            throw new Error('Este e-mail já está cadastrado.');
          }
          throw authError;
        }

        if (!authData.user) throw new Error('Não foi possível obter dados do usuário após cadastro.');
        console.log('Usuário Auth criado:', authData.user.id);

        // 2. Upload photo (now authenticated)
        let fotoUrl = null;
        if (imageFile) {
          console.log('Tentando upload da foto...');
          fotoUrl = await uploadAvatar(authData.user.id);
          console.log('Upload concluído, URL:', fotoUrl);
        }

        // 3. Insert into "usuarios" table
        console.log('Inserindo na tabela usuarios...');
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            nome: values.fullName,
            email: values.email,
            telefone: values.phone,
            cargo: values.role,
            crmv: values.role === 'veterinario' ? values.crmv : null,
            foto_url: fotoUrl,
            ativo: true
          });

        if (dbError) {
          console.error('Erro no DB:', dbError);
          throw new Error(`Erro ao salvar dados extras: ${dbError.message}`);
        }

        toast({ 
          title: 'Conta criada com sucesso!', 
          description: 'Sua conta foi criada. Agora você pode fazer login.' 
        });
        
        // Limpar tudo após sucesso
        setIsSignUp(false);
        form.reset();
        setImageFile(null);
        setImagePreview(null);
      } else {
        // Sign In
        const { error, data } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos.');
          }
          throw error;
        }

        if (data.user) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('cargo')
            .eq('id', data.user.id)
            .single();

          if (usuario?.cargo === 'admin') navigate('/');
          else if (usuario?.cargo === 'veterinario') navigate('/minha-agenda');
          else if (usuario?.cargo === 'recepcionista') navigate('/agenda');
          else navigate('/');
        }
      }

    } catch (error: any) {
      console.error('Erro na submissão:', error);
      toast({ 
        title: 'Ops! Ocorreu um problema', 
        description: error.message || 'Erro inesperado. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-0 shadow-primary/10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <PawPrint className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PetFlow</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema para Clínica Veterinária</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && (
                <div className="flex flex-col items-center justify-center space-y-2 mb-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Avatar className="h-24 w-24 border-2 border-primary/20 group-hover:border-primary transition-colors">
                      <AvatarImage src={imagePreview || ''} className="object-cover" />
                      <AvatarFallback className="bg-muted">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-primary-foreground shadow-lg">
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <span className="text-xs text-muted-foreground">Foto de perfil (opcional)</span>
                </div>
              )}

              {isSignUp && (
                <>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(00) 00000-0000" 
                              {...field} 
                              onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cargo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="veterinario">Veterinário</SelectItem>
                              <SelectItem value="recepcionista">Recepcionista</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {selectedRole === 'veterinario' && (
                    <FormField
                      control={form.control}
                      name="crmv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CRMV</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-SP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={isSignUp ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isSignUp && (
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                form.reset();
                setImageFile(null);
                setImagePreview(null);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {isSignUp ? 'Já tenho conta' : 'Criar nova'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
