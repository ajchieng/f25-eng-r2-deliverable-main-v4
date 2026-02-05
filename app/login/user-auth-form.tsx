"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Template: https://github.com/shadcn/taxonomy/blob/main/components/user-auth-form.tsx

// Create Zod object schema with validations
const userAuthSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).optional(),
});

// Use Zod to extract inferred type from schema
type FormData = z.infer<typeof userAuthSchema>;

export default function UserAuthForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Create form with react-hook-form and use Zod schema to validate the form submission (with resolver)
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const router = useRouter();

  // Obtain supabase client from context provider
  const supabaseClient = createBrowserSupabaseClient();

  const onSubmit = async (input: FormData) => {
    setIsLoading(true);

    if (step === "request") {
      const email = input.email.toLowerCase();
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      setIsLoading(false);

      if (error) {
        return toast({
          title: "Something went wrong.",
          description: error.message,
          variant: "destructive",
        });
      }

      setRequestedEmail(email);
      setStep("verify");

      return toast({
        title: "Check your email",
        description: "Enter the verification code we sent.",
      });
    }

    const email = requestedEmail ?? input.email.toLowerCase();
    const code = input.code?.replace(/\s+/g, "");

    if (!code) {
      setIsLoading(false);
      return toast({
        title: "Enter your code",
        description: "Please enter the verification code from your email.",
        variant: "destructive",
      });
    }

    const { error } = await supabaseClient.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setIsLoading(false);

    if (error) {
      return toast({
        title: "Invalid code",
        description: error.message,
        variant: "destructive",
      });
    }

    router.replace("/species");
    router.refresh();
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={(e: BaseSyntheticEvent) => void handleSubmit(onSubmit)(e)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || step === "verify"}
              {...register("email")}
            />
            {errors?.email && <p className="px-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          {step === "verify" && (
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="code">
                Verification code
              </Label>
              <Input
                id="code"
                placeholder="8-digit code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isLoading}
                {...register("code")}
              />
              {errors?.code && <p className="px-1 text-xs text-red-600">{errors.code.message}</p>}
            </div>
          )}
          <Button disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {step === "request" ? "Send Code" : "Verify Code"}
          </Button>
          {step === "verify" && (
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={() => {
                setStep("request");
                setRequestedEmail(null);
                setValue("code", "");
              }}
            >
              Use a different email
            </Button>
          )}
          {step === "verify" && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                void (async () => {
                  const email = (requestedEmail ?? "").trim();
                  if (!email) {
                    toast({
                      title: "Missing email",
                      description: "Please enter your email first.",
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsLoading(true);
                  const { error } = await supabaseClient.auth.signInWithOtp({
                    email,
                    options: {
                      shouldCreateUser: true,
                    },
                  });
                  setIsLoading(false);

                  if (error) {
                    toast({
                      title: "Could not resend",
                      description: error.message,
                      variant: "destructive",
                    });
                    return;
                  }

                  setValue("code", "");
                  toast({
                    title: "Code resent",
                    description: "Check your email for a new code.",
                  });
                })();
              }}
            >
              Resend code
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
