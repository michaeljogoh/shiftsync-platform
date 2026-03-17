'use client';

import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { LoginInput } from '@/lib/validations/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { apiClient } from '@/lib/api/client/client';
import type { LoginResponse } from '@/types/auth';
import { cn } from '@/lib/utils';

export interface LoginFormProps {
  className?: string;
}

export function LoginForm({
  className,
  ...props
}: LoginFormProps & React.ComponentProps<'div'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    defaultValues: { email: '', password: '', rememberMe: true },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  async function onSubmit(data: LoginInput) {
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const { accessToken, session } = res.data;
      setAuth(accessToken, session, data.rememberMe ?? true);
      toast.success('Signed in successfully');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ??
          (err.response?.data as { error?: string })?.error ??
          err.message;
        const status = err.response?.status;
        if (status === 401) {
          setError('root', {
            type: 'manual',
            message: 'Invalid email or password.',
          });
        } else {
          setError('root', {
            type: 'manual',
            message: msg || 'Login failed. Please try again.',
          });
        }
      } else {
        setError('root', {
          type: 'manual',
          message: 'Something went wrong. Please try again.',
        });
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {errors.root && (
                <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                  {errors.root.message}
                </div>
              )}

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Field>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    {...register('rememberMe')}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  <FieldLabel htmlFor="rememberMe" className="font-normal text-slate-300">
                    Remember me
                  </FieldLabel>
                </div>
                <FieldDescription>
                  Extends how long you stay signed in
                </FieldDescription>
              </Field>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}