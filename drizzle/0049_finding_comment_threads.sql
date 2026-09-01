ALTER TABLE `findingComments` ADD COLUMN `parentCommentId` int NULL;
ALTER TABLE `findingComments` ADD CONSTRAINT `findingComments_parentCommentId_findingComments_id_fk` FOREIGN KEY (`parentCommentId`) REFERENCES `findingComments`(`id`) ON DELETE cascade;
CREATE INDEX `finding_comment_parent_created_idx` ON `findingComments` (`parentCommentId`, `createdAt`);
