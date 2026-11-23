-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imagePublicId" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "SiteImage" (
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteImage_pkey" PRIMARY KEY ("key")
);

-- Como el resto de tablas en Supabase: sin acceso por la Data API (anon /
-- authenticated). Prisma se conecta como dueño de la tabla y no le afecta.
ALTER TABLE "SiteImage" ENABLE ROW LEVEL SECURITY;
