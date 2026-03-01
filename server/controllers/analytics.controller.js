import { getAnalyticsOverview } from "../services/analytics.service.js";
import { buildTaskFilters } from "../services/task-query.service.js";

export const overview = async (req, res, next) => {
  try {
    const filters = buildTaskFilters({
      query: req.query,
      userId: req.user.id,
      workspaceId: req.workspace.id,
    });

    const data = await getAnalyticsOverview({
      userId: req.user.id,
      workspaceId: req.workspace.id,
      filters,
      query: req.query,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

