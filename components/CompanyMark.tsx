import Image from "next/image";

export default function CompanyMark({ id, size = 28 }: { id: string; size?: number }) {
  return <Image src={`/company-marks/${id}.svg`} alt="" width={size} height={size} />;
}
