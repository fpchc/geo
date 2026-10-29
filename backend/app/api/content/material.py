"""资料上传路由（F-07）。

上传属外部存储写入，挂 require_idempotency_key 防重复提交。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies.auth import require_permission
from app.api.dependencies.services import get_material_service
from app.schemas.content import MaterialOut
from app.schemas.response import BizResponse
from app.services.content.material_service import MaterialService

router = APIRouter(prefix="/content/materials", tags=["content:material"])


@router.post(
    "",
    summary="上传资料（校验格式/大小并解析全文）",
    description="上传资料。需携带 X-Idempotency-Key 防重复提交。",
    dependencies=[
        Depends(require_permission("content:material:create")),
        # Depends(require_idempotency_key),
    ],
)
async def upload_material(
    file: UploadFile = File(description="资料文件（txt/md/pdf/docx）"),
    service: MaterialService = Depends(get_material_service),
) -> BizResponse[MaterialOut]:
    data = await file.read()
    return BizResponse.ok(await service.upload(file.filename or "unnamed", data))
