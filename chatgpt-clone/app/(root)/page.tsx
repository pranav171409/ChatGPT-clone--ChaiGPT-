import { ModeToggle } from "@/components/ui/modeToggle";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";


export default function Home() {
  return (
    <div>
      <h1>Hello World</h1>
        <ModeToggle />
        <UserButton />
    </div>
  );
}
