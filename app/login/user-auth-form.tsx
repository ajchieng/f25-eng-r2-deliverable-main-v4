"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

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
  // Supabase OTP is email-based in this flow.
  email: z.string().email(),
  // Code is entered only during verify step.
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
  // request -> send OTP, verify -> submit OTP token.
  const [step, setStep] = useState<"request" | "verify">("request");
  // Persist requested email so verify/resend can reuse it.
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const router = useRouter();
  const emailErrorId = "email-error";
  const codeErrorId = "code-error";

  // Obtain supabase client from context provider
  const supabaseClient = createBrowserSupabaseClient();

  const onSubmit = async (input: FormData) => {
    // Prevent duplicate submissions while previous request is pending.
    setIsLoading(true);

    if (step === "request") {
      // Normalize before sending to Supabase.
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
    // Users sometimes paste with spaces; strip them before verification.
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

    // Successful verification: navigate to first protected feature.
    router.replace("/species");
    router.refresh();
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={(e: BaseSyntheticEvent) => void handleSubmit(onSubmit)(e)} aria-busy={isLoading}>
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
              aria-invalid={!!errors?.email}
              aria-describedby={errors?.email ? emailErrorId : undefined}
              {...register("email")}
            />
            {errors?.email && (
              // Inline validation feedback bound via aria-describedby.
              <p id={emailErrorId} role="alert" className="px-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
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
                aria-invalid={!!errors?.code}
                aria-describedby={errors?.code ? codeErrorId : undefined}
                {...register("code")}
              />
              {errors?.code && (
                // Inline validation feedback for OTP field.
                <p id={codeErrorId} role="alert" className="px-1 text-xs text-destructive">
                  {errors.code.message}
                </p>
              )}
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
                // Return to email step and clear stale code input.
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
                  // Resend uses the same email previously requested.
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
                  // Keep user in verify step with a clean code field.
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
