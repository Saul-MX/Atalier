"use client";

import { RulerIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Medidas corporales orientativas (cm).
const ROWS = [
  { size: "XS", chest: "80–84", waist: "62–66", hip: "86–90" },
  { size: "S", chest: "85–89", waist: "67–71", hip: "91–95" },
  { size: "M", chest: "90–94", waist: "72–76", hip: "96–100" },
  { size: "L", chest: "95–100", waist: "77–82", hip: "101–106" },
  { size: "XL", chest: "101–106", waist: "83–88", hip: "107–112" },
];

export function SizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto px-0 text-sm">
          <RulerIcon aria-hidden="true" />
          Guía de tallas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Guía de tallas</DialogTitle>
          <DialogDescription>
            Medidas corporales en centímetros. Si estás entre dos tallas, elige
            la mayor para un ajuste más holgado.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Equivalencia entre talla y medidas de pecho, cintura y cadera
            </caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Talla
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Pecho
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Cintura
                </th>
                <th scope="col" className="py-2 font-medium">
                  Cadera
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.size} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">
                    {row.size}
                  </th>
                  <td className="py-2 pr-4 tabular-nums">{row.chest}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.waist}</td>
                  <td className="py-2 tabular-nums">{row.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
