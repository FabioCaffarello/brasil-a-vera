import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parlamentaresRouter from "./parlamentares";
import votacoesRouter from "./votacoes";
import proposicoesRouter from "./proposicoes";
import buscaRouter from "./busca";
import partidosRouter from "./partidos";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/parlamentares/comparar", (req, res, next) => {
  req.url = "/comparar/resultado" + (req.url === "/" ? "" : req.url);
  parlamentaresRouter(req, res, next);
});
router.use("/parlamentares", parlamentaresRouter);
router.use("/votacoes", votacoesRouter);
router.use("/proposicoes", proposicoesRouter);
router.use("/busca", buscaRouter);
router.use("/partidos", partidosRouter);

export default router;
