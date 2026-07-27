-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "original_name" VARCHAR(1024) NOT NULL,
    "stored_name" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_stored_name_key" ON "documents"("stored_name");

-- CreateIndex
CREATE INDEX "documents_uploaded_at_idx" ON "documents"("uploaded_at");

-- CreateIndex
CREATE INDEX "documents_mime_type_idx" ON "documents"("mime_type");
