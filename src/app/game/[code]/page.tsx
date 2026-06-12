import GameClient from "@/components/GameClient";

export default async function GamePage({ params }: PageProps<"/game/[code]">) {
  const { code } = await params;
  return <GameClient code={code.toUpperCase()} />;
}
