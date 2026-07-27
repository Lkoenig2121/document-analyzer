-- CreateTable
CREATE TABLE "DocumentAnalysis" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "topics" TEXT[],
    "entities" JSONB NOT NULL,
    "extractedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "DocumentAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAnalysis_documentId_key" ON "DocumentAnalysis"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
