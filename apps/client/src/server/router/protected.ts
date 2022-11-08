import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { emptyScene } from "../../editor/constants";
import { prisma } from "../prisma";
import {
  createFileUploadURL,
  createImageUploadURL,
  createPublishedImageUploadURL,
  createPublishedMetadataUploadURL,
  createPublishedModelUploadURL,
  createSceneUploadURL,
  deleteProjectFromS3,
  deletePublicationFromS3,
  getFileURL,
  getImageURL,
  getSceneURL,
} from "../s3";
import { protectedProcedure } from "./context";
import { router } from "./trpc";

const UUID_LENGTH = 36;
const CUID_LENGTH = 25;
const PROJECT_NAME_LENGTH = 70;
const PROJECT_DESCRIPTION_LENGTH = 2000;

export const protectedRouter = router({
  projects: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: { owner: ctx.address },
      orderBy: { updatedAt: "desc" },
    });

    const images = await Promise.all(
      projects.map(async (project) => await getImageURL(project.id))
    );

    const response = projects.map((project, index) => ({
      ...project,
      image: images[index],
    }));

    return response;
  }),

  project: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
        include: { files: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      return project;
    }),

  projectScene: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Get scene url from S3
      const url = await getSceneURL(input.id);

      return url;
    }),

  projectImage: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Get image url from S3
      const url = await getImageURL(input.id);

      return url;
    }),

  projectFiles: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
        include: { files: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Get file urls from S3
      const urlPromises = project.files.map((file) =>
        getFileURL(input.id, file.storageKey)
      );

      const urls = await Promise.all(urlPromises);

      const response = project.files.map((file, index) => {
        const uri = urls[index];
        if (!uri) throw new Error("Failed to get file url");

        return {
          id: file.storageKey,
          uri,
        };
      });

      return response;
    }),

  projectSceneUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Get scene upload URL from S3
      const url = await createSceneUploadURL(input.id);

      return url;
    }),

  projectImageUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Get image upload URL from S3
      const url = await createImageUploadURL(input.id);

      return url;
    }),

  projectFileUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
        storageKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
        include: { files: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Add file to database if it doesn't exist
      if (!project.files.find((file) => file.storageKey === input.storageKey)) {
        await prisma.file.create({
          data: {
            storageKey: input.storageKey,
            projectId: input.id,
          },
        });
      }

      // Get file upload URL from S3
      const url = await createFileUploadURL(input.id, input.storageKey);
      return url;
    }),

  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().max(PROJECT_NAME_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create project
      const { id } = await prisma.project.create({
        data: {
          owner: ctx.address,
          name: input.name,
        },
      });

      // Upload default scene to S3
      const url = await createSceneUploadURL(id);
      await fetch(url, {
        method: "PUT",
        body: JSON.stringify(emptyScene),
        headers: {
          "Content-Type": "application/json",
        },
      });

      return id;
    }),

  saveProject: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
        name: z.string().max(PROJECT_NAME_LENGTH).optional(),
        description: z.string().max(PROJECT_DESCRIPTION_LENGTH).optional(),
        publicationId: z.string().length(CUID_LENGTH).or(z.null()).optional(),
        editorState: z
          .object({
            visuals: z.boolean(),
            tool: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
        include: { files: true },
      });
      if (!project) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Update database
      await prisma.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          editorState: JSON.stringify(input.editorState),
          publicationId: input.publicationId,
        },
      });
    }),

  deleteProject: protectedProcedure
    .input(
      z.object({
        id: z.string().length(UUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await prisma.project.findFirst({
        where: { id: input.id, owner: ctx.address },
        include: { files: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const promises: Promise<any>[] = [];

      // Delete files from database
      await prisma.file.deleteMany({
        where: { projectId: input.id },
      });

      // Delete project from database
      promises.push(
        prisma.project.delete({
          where: { id: input.id },
          include: { files: true },
        })
      );

      // Delete project from S3
      const storageKeys = project.files.map((file) => file.storageKey);
      promises.push(deleteProjectFromS3(input.id, storageKeys));

      await Promise.all(promises);
    }),

  publishedModelUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(CUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the publication
      const publication = await prisma.publication.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!publication) throw new TRPCError({ code: "NOT_FOUND" });

      // Get model upload URL from S3
      const url = await createPublishedModelUploadURL(input.id);

      return url;
    }),

  publishedImageUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(CUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the publication
      const publication = await prisma.publication.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!publication) throw new TRPCError({ code: "NOT_FOUND" });

      // Get image upload URL from S3
      const url = await createPublishedImageUploadURL(input.id);

      return url;
    }),

  publishedMetadataUploadURL: protectedProcedure
    .input(
      z.object({
        id: z.string().length(CUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the publication
      const publication = await prisma.publication.findFirst({
        where: { id: input.id, owner: ctx.address },
      });
      if (!publication) throw new TRPCError({ code: "NOT_FOUND" });

      // Get metadata upload URL from S3
      const url = await createPublishedMetadataUploadURL(input.id);

      return url;
    }),

  createPublication: protectedProcedure.mutation(async ({ ctx }) => {
    // Create publication
    const { id } = await prisma.publication.create({
      data: { owner: ctx.address, type: "SPACE" },
    });

    return id;
  }),

  linkPublication: protectedProcedure
    .input(
      z.object({
        lensId: z.string(),
        publicationId: z.string().length(CUID_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the publication
      const publication = await prisma.publication.findFirst({
        where: { id: input.publicationId, owner: ctx.address },
      });
      if (!publication) throw new TRPCError({ code: "NOT_FOUND" });

      // Save lensId to publication
      await prisma.publication.update({
        where: { id: input.publicationId },
        data: { lensId: input.lensId },
      });
    }),

  deletePublication: protectedProcedure
    .input(
      z.object({
        lensId: z.string().optional(),
        publicationId: z.string().length(CUID_LENGTH).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let id = input.publicationId;

      // If lensId is provided, find the publication
      if (input.lensId) {
        const publication = await prisma.publication.findFirst({
          where: { lensId: input.lensId, owner: ctx.address },
        });
        if (!publication) throw new TRPCError({ code: "NOT_FOUND" });
        id = publication.id;
      }

      if (!id) throw new TRPCError({ code: "BAD_REQUEST" });

      // Verify user owns the publication
      const publication = await prisma.publication.findFirst({
        where: { id, owner: ctx.address },
      });
      if (!publication) throw new TRPCError({ code: "NOT_FOUND" });

      const promises: Promise<any>[] = [];

      // Delete publication from database
      promises.push(
        prisma.publication.delete({
          where: { id },
          include: { ViewEvents: true },
        })
      );

      // Remove publicationId from projects
      promises.push(
        prisma.project.updateMany({
          where: { publicationId: id },
          data: { publicationId: null },
        })
      );

      // Delete publication from S3
      promises.push(deletePublicationFromS3(id));

      await Promise.all(promises);
    }),
});
