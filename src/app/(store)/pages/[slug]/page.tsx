import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/content/pages";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { ContentBody } from "@/components/store/content-body";

export async function generateMetadata(props: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getContentPage(slug);
  if (!page) return {};
  return { title: page.title, alternates: { canonical: `/pages/${page.slug}` }, robots: page.isDraft ? { index: false } : undefined };
}

export default async function ContentPage(props: PageProps<"/pages/[slug]">) {
  const { slug } = await props.params;
  const page = await getContentPage(slug);
  if (!page) notFound();
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "דף הבית", href: "/" }, { label: page.title }]} />
      <h1 className="my-5 text-3xl">{page.title}</h1>
      {page.isDraft && (
        <Alert tone="warning" title="טיוטה – טעון אישור" className="mb-6 max-w-3xl">
          תוכן זה הוא טיוטה ראשונית לצורכי פיתוח ואינו מסמך מאושר. יש לבדוק ולאשר אותו לפני עלייה לאוויר.
        </Alert>
      )}
      <ContentBody body={page.body} />
      <p className="mt-8 text-xs text-ink-soft">עודכן לאחרונה: {page.updatedAt.toLocaleDateString("he-IL")}</p>
    </div>
  );
}
