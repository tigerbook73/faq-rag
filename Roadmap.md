# 代完善内容

- IS_CLOUD标识名称有问题，直接用 EMBEDDING_PROVIDER 就好了
- chat-storage.ts文件需要重构，里面API和sessionStorage混在一起了, 需要分开来
- chat-storage.ts文件，关于sessionStorage的部分，直接提供对象接口，而不是仅提供key常量
