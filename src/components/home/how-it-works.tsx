import { CameraIcon, FileIcon, PinIcon } from "@/components/icons";

const STEPS = [
  {
    icon: PinIcon,
    title: "1. Elige tu estación",
    text: "Se recuerda en tu dispositivo para la próxima vez.",
  },
  {
    icon: FileIcon,
    title: "2. Completa el formulario",
    text: "Responde los campos del formulario que elijas.",
  },
  {
    icon: CameraIcon,
    title: "3. Adjunta fotos y envía",
    text: "Toma una foto con la cámara o elígela de tu galería.",
  },
] as const;

export function HowItWorks() {
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3.5">
          <span className="bg-brand-100 text-brand-600 grid size-[46px] flex-none place-items-center rounded-xl">
            <Icon size={22} />
          </span>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-muted text-[0.92rem]">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
