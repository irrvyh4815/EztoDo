export function isProjectCreator(project, userId) {
  return Boolean(userId && (project.createdBy || project.ownerId) === userId);
}

export function groupHomeProjects(projects, userId) {
  const owned = [];
  const invited = [];
  const other = [];
  for (const project of projects) {
    if (isProjectCreator(project, userId)) owned.push(project);
    else if (project.memberRole && project.memberRole !== "admin") invited.push(project);
    else other.push(project);
  }
  return [
    { id: "owned", title: "我建立的工地", description: "由你建立，可依權限編輯及刪除工地。", projects: owned },
    { id: "invited", title: "受邀參與的工地", description: "依邀請授權參與編輯或閱覽，無法刪除工地。", projects: invited },
    ...(other.length ? [{ id: "other", title: "其他工地（系統管理）", description: "因系統管理權限可查看，並非你建立或受邀參與的工地。", projects: other }] : []),
  ];
}
