import PairingPage from "@/components/kiosk/PairingPage";

export default async function PairPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string | string[] }>;
}) {
    const { code } = await searchParams;
    const initialCode = Array.isArray(code) ? code[0] ?? "" : code ?? "";
    return <PairingPage initialCode={initialCode} />;
    return <PairingPage initialCode={initialCode} />;
}
