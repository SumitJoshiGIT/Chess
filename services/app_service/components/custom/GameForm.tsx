import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function GameSelector() {
  return (
       <>
       <h2 className="text-xl font-bold mb-4">Select Game Category and Duration</h2>
        <form>
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Blitz</Label>
              <div className="flex space-x-2 mt-2">
                <Button type="button" variant="outline" value="blitz-3">3 minutes</Button>
                <Button type="button" variant="outline" value="blitz-5">5 minutes</Button>
                <Button type="button" variant="outline" value="blitz-10">10 minutes</Button>
              </div>
            </div>
            <div>
              <Label className="text-lg font-semibold">Rapid</Label>
              <div className="flex space-x-2 mt-2">
                <Button type="button" variant="outline" value="rapid-10">10 minutes</Button>
                <Button type="button" variant="outline" value="rapid-15">15 minutes</Button>
                <Button type="button" variant="outline" value="rapid-25">25 minutes</Button>
              </div>
            </div>
            <div>
              <Label className="text-lg font-semibold">Classical</Label>
              <div className="flex space-x-2 mt-2">
                <Button type="button" variant="outline" value="classical-30">30 minutes</Button>
                <Button type="button" variant="outline" value="classical-60">60 minutes</Button>
                <Button type="button" variant="outline" value="classical-90">90 minutes</Button>
              </div>
            </div>
          </div>
          <Button type="submit" className="mt-4 w-full">Start Game</Button>
        </form>
    </>
  );
}
