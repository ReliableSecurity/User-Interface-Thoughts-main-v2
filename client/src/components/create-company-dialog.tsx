import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Название компании обязательно").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateCompanyDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Создать компанию
          </DialogTitle>
          <DialogDescription className="sr-only">
            Создание компании внутри проекта для группировки целей
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название компании</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Например: Яблоко"
                      {...field}
                      data-testid="input-company-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (необязательно)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Краткое описание компании..."
                      className="resize-none"
                      {...field}
                      data-testid="input-company-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit-company"
              >
                {isLoading ? "Создание..." : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
