import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Chess piece symbols for promotion options
const PROMOTION_PIECES = {
  queen: { white: "♕", black: "♛" },
  rook: { white: "♖", black: "♜" },
  bishop: { white: "♗", black: "♝" },
  knight: { white: "♘", black: "♞" }
};

interface PromotionDialogProps {
  isOpen: boolean;
  playerColor: 'white' | 'black';
  onSelect: (piece: string) => void;
  onClose: () => void;
}

export default function PromotionDialog({ 
  isOpen, 
  playerColor, 
  onSelect, 
  onClose 
}: PromotionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Choose promotion piece</DialogTitle>
        <div className="flex justify-center gap-4 py-4">
          <Button 
            className="w-16 h-16 text-4xl" 
            variant="outline"
            onClick={() => onSelect('q')}
          >
            {PROMOTION_PIECES.queen[playerColor]}
          </Button>
          <Button 
            className="w-16 h-16 text-4xl" 
            variant="outline"
            onClick={() => onSelect('r')}
          >
            {PROMOTION_PIECES.rook[playerColor]}
          </Button>
          <Button 
            className="w-16 h-16 text-4xl" 
            variant="outline"
            onClick={() => onSelect('b')}
          >
            {PROMOTION_PIECES.bishop[playerColor]}
          </Button>
          <Button 
            className="w-16 h-16 text-4xl" 
            variant="outline"
            onClick={() => onSelect('n')}
          >
            {PROMOTION_PIECES.knight[playerColor]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
