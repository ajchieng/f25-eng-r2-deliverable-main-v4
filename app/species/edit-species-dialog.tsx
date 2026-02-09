"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ENDANGERMENT_STATUSES, KINGDOMS, type Species } from "./types";

// Keep enum validation consistent with add dialog and DB enum constraints.
const kingdoms = z.enum(KINGDOMS);
const endangermentStatuses = z.enum(ENDANGERMENT_STATUSES);

// Schema validates and normalizes edit input before sending updates to Supabase.
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val.trim()),
  common_name: z
    .string()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  endangerment_status: endangermentStatuses,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim()))
    .refine((val) => val === null || z.string().url().safeParse(val).success, "Please enter a valid image URL."),
  description: z
    .string()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

export default function EditSpeciesDialog({ species }: { species: Species }) {
  const router = useRouter();
  // Controlled open state lets us intercept close events and warn about unsaved changes.
  const [open, setOpen] = useState<boolean>(false);

  // Initialize form with current row values.
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues: {
      scientific_name: species.scientific_name,
      common_name: species.common_name,
      kingdom: species.kingdom,
      endangerment_status: species.endangerment_status,
      total_population: species.total_population,
      image: species.image,
      description: species.description,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      // Whenever dialog reopens, reset form to latest server-provided species values.
      form.reset({
        scientific_name: species.scientific_name,
        common_name: species.common_name,
        kingdom: species.kingdom,
        endangerment_status: species.endangerment_status,
        total_population: species.total_population,
        image: species.image,
        description: species.description,
      });
    }
  }, [form, open, species]);

  const onSubmit = async (input: FormData) => {
    const supabase = createBrowserSupabaseClient();
    // Update only this species row, preserving all unchanged fields.
    const { error } = await supabase
      .from("species")
      .update({
        scientific_name: input.scientific_name,
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        endangerment_status: input.endangerment_status,
        total_population: input.total_population,
        image: input.image,
      })
      .eq("id", species.id);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Close, refresh data-backed server components, then notify.
    setOpen(false);
    router.refresh();

    return toast({
      title: "Species updated!",
      description: "Successfully updated " + input.scientific_name + ".",
    });
  };

  const confirmDiscardChanges = () => {
    if (!form.formState.isDirty) {
      // No changes made, safe to close immediately.
      return true;
    }

    // Guard against accidental close if user modified any fields.
    return window.confirm("You have unsaved changes. Canceling now will discard them. Continue?");
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    // Always allow opening; gate closing behind unsaved-changes confirmation.
    if (nextOpen || confirmDiscardChanges()) {
      setOpen(nextOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Species</DialogTitle>
          <DialogDescription>Update the fields below, then click save when you&apos;re done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* Wrap submit with RHF handler so zod validation runs before onSubmit. */}
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              {/* Scientific name field. */}
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cavia porcellus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kingdom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom) => (
                            <SelectItem key={kingdom} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endangerment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endangerment status</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(endangermentStatuses.parse(value))}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select endangerment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {endangermentStatuses.options.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={value ?? ""}
                          placeholder="300000"
                          {...rest}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            // Convert empty string to null for optional numeric DB column.
                            field.onChange(nextValue === "" ? null : Number(nextValue));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          value={value ?? ""}
                          placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="flex">
                {/* Prevent duplicate updates while request is in flight. */}
                <Button type="submit" className="ml-1 mr-1 flex-auto" disabled={form.formState.isSubmitting}>
                  Save Changes
                </Button>
                {/* Route cancel through shared open-change handler to reuse discard protection. */}
                <Button
                  type="button"
                  className="ml-1 mr-1 flex-auto"
                  variant="secondary"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
