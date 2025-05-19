"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";

type GameFormValues = {
  timeControl: string;
};

const TIME_CONTROLS = [
  { label: "Blitz", options: [
    { label: "3 minutes", value: "blitz-3" ,id:0 },
    { label: "5 minutes", value: "blitz-5" ,id:1},
    { label: "10 minutes", value: "blitz-10",id:2 },
  ]},
  { label: "Rapid", options: [
    { label: "10 minutes", value: "rapid-10" ,id:3 },
    { label: "15 minutes", value: "rapid-15", id:4 },
    { label: "25 minutes", value: "rapid-25", id:5 },
  ]},
  { label: "Classical", options: [
    { label: "30 minutes", value: "classical-30",id:6 },
    { label: "60 minutes", value: "classical-60" ,id:7 },
    { label: "90 minutes", value: "classical-90",id :8 },
  ]},
];

export default function GameSelector() {
  const { handleSubmit, control, watch } = useForm<GameFormValues>({
    defaultValues: { timeControl: "" },
  });

  const selected = watch("timeControl");

  const onSubmit = (data: GameFormValues) => {
    // handle form submission
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <Controller
          name="timeControl"
          control={control}
          render={({ field }) => (
            <>
              {TIME_CONTROLS.map((group) => (
                <div key={group.label}>
                  <Label className="text-lg font-semibold">{group.label}</Label>
                  <div className="flex space-x-2 mt-2">
                    {group.options.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected === option.value ? "default" : "outline"}
                        value={option.value}
                        onClick={() => field.onChange(option.value)}
                        aria-pressed={selected === option.value}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        />
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={!selected}>
        Start Game
      </Button>
    </form>
  );
}
