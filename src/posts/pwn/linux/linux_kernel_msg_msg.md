# 每日一个linux结构体(1)-msg_msg篇章

> 参考文章:[从ciscn 2022半决赛赛题：浅析msg_msg结构体 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/625446910)

消息队列是linux用来模块之间进行交流的流程大概是:

- msgget函数创建了一个消息队列
  - 返回消息队列的`msgid`作为进程的唯一标识符；失败则返回`-1`
- msgsnd函数向消息队列中发送消息
- msgrcv函数读取消息

`/include/linux/msg.h`源码位置

```c
struct msg_msg {
	struct list_head m_list;
	long m_type;
	size_t m_ts;		/* message text size */
	struct msg_msgseg *next;
	void *security;
	/* the actual message follows immediately */
};
struct list_head {
	struct list_head *next, *prev;
};
struct msg_msgseg {
	struct msg_msgseg *next;
	/* the next part of the message follows immediately */
};
```

- m_list是双向链表
- next就是个单链表

## 开发角度浅了解消息队列机制

> 参考文章:[Linux下的消息队列msgrcv实现及应用 (linux消息队列msgrcv) – 后浪云 (idc.net)](https://www.idc.net/help/151603/)
>
> 消息队列是一种进程间通信方式，它是消息的链表，存放在内核中

- `msgrcv`函数

  ```c
  ssize_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtyp, int msg);
  ```

  - **msqid** 消息队列标识符,通过**msgget**函数创建消息队列后返回的一个值
  - **msgp** 消息的接受缓冲区指针,调用**msgrcv**函数后,内核将消息从消息队列中取到该缓冲区中,也就是存在kernelToUser
  - **msgsz** 接受缓冲区大小（至少应该是消息的长度）
  - **msgtyp** 也就是所读消息的类型,其值为0 可以从消息队列中读取一条消息,其他值就是值为`msgtyp`的消息将会被获取
  - **msg**也就是消息接受方式
    - IPC_NOWT 如果消息队列中没有符合要求的消息，则返回-1，并将errno设置为ENOMSG。
    - MSG_NOERROR：如果消息长度超过msgsz，则被截断。
    - MSG_EXCEPT：读取类型为msgtyp以外所有类型的消息，而不是读取类型为msgtyp的消息。
    - MSG_COPY：读取类型为msgtyp的消息时，内核将消息从消息队列中移除，并将其复制到`msgp`中，而不是返回一个指向缓冲区的指针 也就是将消息从内核消息中拷贝到`msgp`中(我们指定的缓冲区)

- 发送端

  ![code](/Users/elegy/Pictures/code.png)

### msgget函数

> 原文:msgget函数可以创建新的消息队列或者获取已经拥有的消息队列
>
> 会创建一个msg_queue结构体当消息队列msg_msg双向循环链表的起点
>
> **需要注意的是后续若某进程调用`msgsnd`函数对消息队列进行写操作，需要该进程有写权限**
>
> **同理`msgrcv`需要有读权限。这是由`msgget`函数中的第二个参数中的权限控制符所决定的。**

```c
int msgget(key_t key, int msgflag)
```

- key的值为函数ftok的返回值或IPC_PRIVATE，若为
  IPC_PRIVATE则直接创建新的消息队列

### msgsnd函数

> 相当于向指定的消息队列上发送一条指定大小的message时,会建立`msg_msg`结构体
>
> 然后这里会调用load_msg函数对msg进行初始化
>
> 并且我们可以看见do_msgsnd里面定义了`msg_queue`作为`msg_msg`队列的链表头。

- 原文中对msgsnd概括性解释

![img](https://pic2.zhimg.com/v2-c8cbafbb660d672c74bffe776a6cc7ff_r.jpg)

- 下面是源码

![QQ_1726781237796](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726781237796.png)

- 然后load_msg会调用`alloc_msg`并且将用户态的数据copy到msg去

```c
struct msg_msg *load_msg(const void __user *src, size_t len)
{
	struct msg_msg *msg;
	struct msg_msgseg *seg;
	int err = -EFAULT;
	size_t alen;

	msg = alloc_msg(len);
	if (msg == NULL)
		return ERR_PTR(-ENOMEM);

	alen = min(len, DATALEN_MSG);
	if (copy_from_user(msg + 1, src, alen))
		goto out_err;

	for (seg = msg->next; seg != NULL; seg = seg->next) {
		len -= alen;
		src = (char __user *)src + alen;
		alen = min(len, DATALEN_SEG);
		if (copy_from_user(seg + 1, src, alen))
			goto out_err;
	}

	err = security_msg_msg_alloc(msg);
	if (err)
		goto out_err;

	return msg;

out_err:
	free_msg(msg);
	return ERR_PTR(err);
}
```

- `copy_from_user`函数将用户态数据拷贝到内核去

- `alloc_msg`去申请内存

  ```c
  static struct msg_msg *alloc_msg(size_t len)
  {
  	struct msg_msg *msg;
  	struct msg_msgseg **pseg;
  	size_t alen;
    // #define DATALEN_MSG ((size_t)PAGE_SIZE - sizeof(struct msg_msg))  
  	alen = min(len, DATALEN_MSG);
  	// struct msg_msg {
  		// 	struct list_head m_list;
  		// 	long m_type;
  		// 	size_t m_ts; /* message text size */
  		// 	struct msg_msgseg *next;
  		// 	void *security;
  		// 	/* the actual message follows immediately */
  	// };
    msg = kmalloc(sizeof(*msg) + alen, GFP_KERNEL_ACCOUNT);
  	if (msg == NULL)
  		return NULL;
  
  	msg->next = NULL;
  	msg->security = NULL;
  
  	len -= alen;
  	pseg = &msg->next;
  	while (len > 0) {
  		struct msg_msgseg *seg;
  
  		cond_resched();
  	
  		alen = min(len, DATALEN_SEG);
  		seg = kmalloc(sizeof(*seg) + alen, GFP_KERNEL_ACCOUNT);
  		if (seg == NULL)
  			goto out_err;
  		*pseg = seg;
  		seg->next = NULL;
  		pseg = &seg->next;
  		len -= alen;
  	}
  
  	return msg;
  
  out_err:
  	free_msg(msg);
  	return NULL;
  }
  ```
  
  - 所以msg_msg最大申请page_size - header_size的大小 因为保底需要header_size也就是0x30空间来存储header
  
  - 如果大小过大导致超过了`DATATLEN_MSG`就让seg来存储源码中的while循环正是完成的这个 seg结构体简单 只是包含了必要的next指针其他全是数据
  
    ```c
    struct msg_msgseg {
    	struct msg_msgseg *next;
    	/* the next part of the message follows immediately */
    };
    ```
  
  - 这里借用原文中的图 描述我们的单个消息存储形式
  
    ![img](https://pic1.zhimg.com/80/v2-618c515207d7a3549b21dee56d146212_1440w.webp)
  
  - 然后多个`msg_msg`是通过`list_head`组成的双向循环链表进行关联 并且定义了`msg_queue`作为`msg_msg`队列的链表头。（前面提及过）
  
    ```c
    struct msg_queue {
    	struct kern_ipc_perm q_perm;
    	time64_t q_stime;		/* last msgsnd time */
    	time64_t q_rtime;		/* last msgrcv time */
    	time64_t q_ctime;		/* last change time */
    	unsigned long q_cbytes;		/* current number of bytes on queue */
    	unsigned long q_qnum;		/* number of messages in queue */
    	unsigned long q_qbytes;		/* max number of bytes on queue */
    	struct pid *q_lspid;		/* pid of last msgsnd */
    	struct pid *q_lrpid;		/* last receive pid */
    
    	struct list_head q_messages;
    	struct list_head q_receivers;
    	struct list_head q_senders;
    } __randomize_layout;
    struct kern_ipc_perm *ipc_obtain_object_idr(struct ipc_ids *ids, int id);
    
    ```
  
    ![QQ_1726784121279](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726784121279.png)

### msgrcv函数

> 原文:`msgrcv`系统调用能从消息队列上接受指定大小的消息，并且选择性（是否）释放`msg_msg`结构体。具体实现源码在`/ipc/msg.c`的`do_msgrcv`中。

```c
size_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtyp,int msgflg)
```

- 原文中对msgrcv的概括性解释

![img](https://picx.zhimg.com/80/v2-465a08a27503a64eaa3a602ee69120fb_1440w.webp)

#### 定位

- 通过find_msg函数进行定位

![QQ_1726817712243](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726817712243.png)

- 通过convert_mode函数获取mode

  ```c
  static inline int convert_mode(long *msgtyp, int msgflg)
  {
  	if (msgflg & MSG_COPY)
  		return SEARCH_NUMBER;
  	/*
  	 *  find message of correct type.
  	 *  msgtyp = 0 => get first.
  	 *  msgtyp > 0 => get first message of matching type.
  	 *  msgtyp < 0 => get message with least type must be < abs(msgtype).
  	 */
  	if (*msgtyp == 0)
  		return SEARCH_ANY;
  	if (*msgtyp < 0) {
  		if (*msgtyp == LONG_MIN) /* -LONG_MIN is undefined */
  			*msgtyp = LONG_MAX;
  		else
  			*msgtyp = -*msgtyp;
  		return SEARCH_LESSEQUAL;
  	}
  	if (msgflg & MSG_EXCEPT)
  		return SEARCH_NOTEQUAL;
  	return SEARCH_EQUAL;
  }
  ```

  - 其实也就是msgflg如果有`MSG_COPY`标志位有值则mode等于`SEARCH_NUMBER`
    - 这里其实就是找到第**msgtyp**条消息
  - 如果msgflg有`MSG_EXCEPT`标志位有值则mode等于`SEARCH_NOTEQUAL`
    - 那么是找到第一个不等于msgtyp的消息
  - `msgtyp`小于0 mode等于`SEARCH_LESSEQUAL`(less equal) 
    - 这里其实msgtyp<0的时候去匹配m_type小于msgtyp的最小消息
  - `msgtyp`等于0 则返回`SEARCH_ANY`(any) 
    - 这里其实匹配任意消息也就是第一个消息
  - 如果都不是则返回`SEARCH_EQUAL` 
    - 这里其实是找到第一个msgtyp等于m_type的消息

- **find_msg**

> 也就是遍历了所有`msg_msg`队列的头节点。然后调用`testmsg`，根据`mode`和传入的`msgtyp`来筛选：

```c
static struct msg_msg *find_msg(struct msg_queue *msq, long *msgtyp, int mode)
{
	struct msg_msg *msg, *found = NULL;
	long count = 0;

	list_for_each_entry(msg, &msq->q_messages, m_list) {
		if (testmsg(msg, *msgtyp, mode) &&
		    !security_msg_queue_msgrcv(&msq->q_perm, msg, current,
					       *msgtyp, mode)) {
			if (mode == SEARCH_LESSEQUAL && msg->m_type != 1) {
				*msgtyp = msg->m_type - 1;
				found = msg;
			} else if (mode == SEARCH_NUMBER) {
				if (*msgtyp == count)
					return msg;
			} else
				return msg;
			count++;
		}
	}

	return found ?: ERR_PTR(-EAGAIN);
}
```

- **testmsg**函数

  ```c
  
  static int testmsg(struct msg_msg *msg, long type, int mode)
  {
  	switch (mode) {
  	case SEARCH_ANY:
  	case SEARCH_NUMBER:
  		return 1;
  	case SEARCH_LESSEQUAL:
  		if (msg->m_type <= type)
  			return 1;
  		break;
  	case SEARCH_EQUAL:
  		if (msg->m_type == type)
  			return 1;
  		break;
  	case SEARCH_NOTEQUAL:
  		if (msg->m_type != type)
  			return 1;
  		break;
  	}
  	return 0;
  }
  ```

#### 释放消息(**list_del**,**free_msg**)

- 也就是list_del先脱链`msg_queue`函数 (unlink)
- **free_msg**释放`msg_msg`单向链表上的所有信息

```c
long ksys_msgrcv(int msqid, struct msgbuf __user *msgp, size_t msgsz,
		 long msgtyp, int msgflg)
{
	return do_msgrcv(msqid, msgp, msgsz, msgtyp, msgflg, do_msg_fill);
}
static long do_msgrcv(int msqid, void __user *buf, size_t bufsz, long msgtyp, int msgflg,
long (*msg_handler)(void __user *, struct msg_msg *, size_t))
{
    int mode;
    struct msg_queue *msq;
    struct ipc_namespace *ns;
    struct msg_msg *msg, *copy = NULL;
    ...........
    ...........
    list_del(&msg->m_list);
    ...........
    ...........

    bufsz = msg_handler(buf, msg, bufsz);
    free_msg(msg);

    return bufsz;
}
```

#### 返回消息

返回消息就是msg_handler进行返回给用户态消息

- KernelToUser消息拷贝

  - 这里msg_handler看`ksys_msgrev`可以发现其实是`do_msg_fill`函数 进行拷贝

    (keys_msgrc/do_msgrcv/do_msg_fill/)

    ```c
    #define put_user(x, ptr) \
      __put_user_check((__typeof__(*(ptr)))(x), (ptr), sizeof(*(ptr)))
    static long do_msg_fill(void __user *dest, struct msg_msg *msg, size_t bufsz)
    {
    	struct msgbuf __user *msgp = dest;
    	size_t msgsz;
    
    	if (put_user(msg->m_type, &msgp->mtype))
    		return -EFAULT;
    
    	msgsz = (bufsz > msg->m_ts) ? msg->m_ts : bufsz;
    	if (store_msg(msgp->mtext, msg, msgsz))
    		return -EFAULT;
    	return msgsz;
    }
    
    ```

  - 然后就是用store_msg进行数据拷贝

    (keys_msgrc/do_msgrcv/do_msg_fill/store_msg)

    ```c
    int store_msg(void __user *dest, struct msg_msg *msg, size_t len)
    {
    	size_t alen;
    	struct msg_msgseg *seg;
    
    	alen = min(len, DATALEN_MSG);
    	if (copy_to_user(dest, msg + 1, alen))
    		return -1;
    
    	for (seg = msg->next; seg != NULL; seg = seg->next) {
    		len -= alen;
    		dest = (char __user *)dest + alen;
    		alen = min(len, DATALEN_SEG);
    		if (copy_to_user(dest, seg + 1, alen))
    			return -1;
    	}
    	return 0;
    }
    ```

  - 我们可以看见这里其实和原本放入消息的时候基本一致,进行大量copy将整个msg_msg的消息发送给用户

  - 这里复制的长度是根据len来定的 而我们的len是msgsz也就是**do_msg_fill**函数

    ```
    msgsz = (bufsz > msg->m_ts) ? msg->m_ts : bufsz;
    ```

    - 也就是我们给msgrcv传入的第三个参数(bufsz)的大小 但是最大为消息本身的大小

#### msg_copy特殊位

```c

static long do_msgrcv(int msqid, void __user *buf, size_t bufsz, long msgtyp, int msgflg,
	       long (*msg_handler)(void __user *, struct msg_msg *, size_t))
{
	int mode;
	struct msg_queue *msq;
	struct ipc_namespace *ns;
	struct msg_msg *msg, *copy = NULL;
	DEFINE_WAKE_Q(wake_q);
	ns = current->nsproxy->ipc_ns;
	...
  if (msgflg & MSG_COPY) {
		....
      // 准备copy文件
		copy = prepare_copy(buf, min_t(size_t, bufsz, ns->msg_ctlmax));
		....
	}
  ...
	for (;;) {
		...
		msg = find_msg(msq, &msgtyp, mode);
		if (!IS_ERR(msg)) {
			...
			/*
			 * If we are copying, then do not unlink message and do
			 * not update queue parameters.
			 */
			if (msgflg & MSG_COPY) {
				msg = copy_msg(msg, copy);
				goto out_unlock0;
			}
		....
		}
		....
  }
out_unlock0:
	ipc_unlock_object(&msq->q_perm);
	wake_up_q(&wake_q);
out_unlock1:
	rcu_read_unlock();
	if (IS_ERR(msg)) {
    // 走入这里
		free_copy(copy);
		return PTR_ERR(msg);
	}
	...
}
```

- 我们会发现当我们携带`MSG_COPY`信息的时候,
  - find_msg首先会找到合适的msg
  - 然后直接进行拷贝操作不会进行del_list正对应了我们前面的`SEARCH_NUMBER`对应操作,也就是将对应的消息拷贝出来然后发送给我们随后将拷贝出来的消息给释放掉从而让我们拥有了多次读取一条消息的能力

## 任意读

上文我们在msgrcv的时候携带`MSG_COPY`的时候,会调用`copy_msg`来进行拷贝消息

```c
struct msg_msg *copy_msg(struct msg_msg *src, struct msg_msg *dst)
{
	struct msg_msgseg *dst_pseg, *src_pseg;
	size_t len = src->m_ts;
	size_t alen;

	if (src->m_ts > dst->m_ts)
		return ERR_PTR(-EINVAL);

	alen = min(len, DATALEN_MSG);
	memcpy(dst + 1, src + 1, alen);

	for (dst_pseg = dst->next, src_pseg = src->next;
	     src_pseg != NULL;
	     dst_pseg = dst_pseg->next, src_pseg = src_pseg->next) {

		len -= alen;
		alen = min(len, DATALEN_SEG);
		memcpy(dst_pseg + 1, src_pseg + 1, alen);
	}

	dst->m_type = src->m_type;
	dst->m_ts = src->m_ts;

	return dst;
}
```

- 然后我们知道调用句子是

  ```c
  msg = copy_msg(msg, copy);
  ```

- 所以我们需要保证取出的消息的m_ts（消息大小）要小于我们需要的消息大小(bufsz)
- 当能主动修改msg_msg->m_ts的时候我们就可以读取最多一页的内存实现越界读取
- 可以修改m_ts和m_list的next指针,堆喷其他结构体然后越界读从而获取一些内核地址

## 任意写

因为`do_msgsnd`调用了load_msg进行用户到内核的数据拷贝,所以我们可以利用userfault的机制暂停一个线程篡改msg->next指针实现任意地址写
