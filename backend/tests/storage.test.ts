import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { StorageService } from "../src/services/storage.service";

describe("Storage & File Attachment Tests", () => {
  it("StorageService.upload saves file and returns valid metadata", async () => {
    const mockFile: Express.Multer.File = {
      fieldname: "file",
      originalname: "test-diagram.png",
      encoding: "7bit",
      mimetype: "image/png",
      buffer: Buffer.from("fake-png-binary-data"),
      size: 20,
      stream: null as any,
      destination: "",
      filename: "",
      path: "",
    };

    const stored = await StorageService.upload(mockFile);
    expect(stored.fileName).toBe("test-diagram.png");
    expect(stored.fileSize).toBe(20);
    expect(stored.mimeType).toBe("image/png");
    expect(stored.fileUrl).toContain("/api/v1/uploads/");

    // Cleanup
    await StorageService.delete(stored.fileUrl);
  });

  it("POST /api/v1/tasks/:id/attachments requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/tasks/some-task-id/attachments")
      .send({});

    expect(res.status).toBe(401);
  });
});
